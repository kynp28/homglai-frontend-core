"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Loader2, Plus, Printer, ScanBarcode, Search } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { getEmployee } from "@/lib/auth";
import { mergeRows, parseSheet, partsToCsv, type ImportRow, type ParsedSheet, type Part } from "@/lib/parts";
import { readXlsx } from "@/lib/xlsx";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { PartForm } from "@/components/parts/part-form";
import { StockBox } from "@/components/parts/stock-box";

const PAGE = 100;

export default function PartsPage() {
  const role = getEmployee()?.role;
  const canEdit = role === "ADMIN" || role === "RECEPTIONIST";
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [inactive, setInactive] = useState(false);
  const [data, setData] = useState<{ total: number; parts: Part[] } | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Part | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE), ...(query ? { search: query } : {}), ...(inactive ? { includeInactive: "true" } : {}) });
    apiData<{ total: number; parts: Part[] }>(`/api/parts?${q}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ"));
  }, [page, query, inactive]);
  useEffect(load, [load]);

  async function exportCsv() {
    const all: Part[] = [];
    for (let p = 1; ; p++) {
      const d = await apiData<{ parts: Part[]; totalPages: number }>(`/api/parts?page=${p}&limit=500&includeInactive=true`);
      all.push(...d.parts);
      if (p >= d.totalPages) break;
    }
    const blob = new Blob([partsToCsv(all)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `parts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const toggle = (id: number, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          อะไหล่ {data && <span className="text-sm font-normal text-muted-foreground">({data.total} รายการ)</span>}
        </h1>
        {canEdit && (
          <>
            <Button asChild>
              <Link href="/staff/parts/scan">
                <ScanBarcode /> ยิงบาร์โค้ด
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setEditing("new")}>
              <Plus /> เพิ่มอะไหล่
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet /> นำเข้า Excel
            </Button>
          </>
        )}
        <Button variant="outline" onClick={exportCsv}>
          <Download /> ส่งออก
        </Button>
        {selected.length > 0 && (
          <Button asChild variant="secondary">
            <Link href={`/print/labels?ids=${selected.join(",")}`}>
              <Printer /> พิมพ์ฉลาก ({selected.length})
            </Link>
          </Button>
        )}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหารหัส ชื่อ หรือรุ่นเครื่อง" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          ค้นหา
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={inactive} onChange={(e) => (setPage(1), setInactive(e.target.checked))} />
          แสดงที่ปิดใช้งาน
        </label>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data && !error && <Loader2 className="animate-spin text-muted-foreground" />}
      {data && (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="เลือกทั้งหน้า"
                      className="accent-primary"
                      checked={data.parts.length > 0 && data.parts.every((p) => selected.includes(p.id))}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...new Set([...s, ...data.parts.map((p) => p.id)])] : s.filter((id) => !data.parts.some((p) => p.id === id))))}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">รหัส</th>
                  <th className="px-3 py-2 font-medium">ชื่ออะไหล่</th>
                  <th className="px-3 py-2 font-medium">ใช้กับรุ่น</th>
                  <th className="px-3 py-2 text-right font-medium">ราคาขาย</th>
                  <th className="px-3 py-2 text-right font-medium">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {data.parts.map((p) => (
                  <tr key={p.id} className={`cursor-pointer border-b last:border-0 hover:bg-accent/50 ${p.isActive ? "" : "text-muted-foreground"}`} onClick={() => setEditing(p)}>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`เลือก ${p.code}`} className="accent-primary" checked={selected.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{p.code}</td>
                    <td className="px-3 py-2">
                      {p.name} {!p.isActive && <Badge variant="outline">ปิดใช้งาน</Badge>}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">{p.machineModels ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.sellPrice ? formatMoney(p.sellPrice) : <span className="text-amber-700">ยังไม่ตั้ง</span>}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${p.stockQty === 0 ? "text-destructive" : ""}`}>{p.stockQty}</td>
                  </tr>
                ))}
                {data.parts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      ยังไม่มีอะไหล่ — เริ่มจาก &quot;ยิงบาร์โค้ด&quot; หรือ &quot;นำเข้า Excel&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          หน้า {page} / {totalPages}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            ถัดไป
          </Button>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "เพิ่มอะไหล่" : "อะไหล่"} className="max-w-xl">
        {editing === "new" && <PartForm onSaved={() => (setEditing(null), load())} onCancel={() => setEditing(null)} />}
        {editing && editing !== "new" && (
          <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto">
            {canEdit ? <PartForm key={editing.id} part={editing} onSaved={(p) => (setEditing(p), load())} /> : <p>{editing.name}</p>}
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-semibold">สต็อก</p>
              {canEdit ? (
                <StockBox key={`${editing.id}-${editing.stockQty}`} part={editing} onChange={(p) => (setEditing(p), load())} />
              ) : (
                <p className="text-2xl font-semibold">{editing.stockQty}</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
    </div>
  );
}

function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [parsed, setParsed] = useState<ParsedSheet[] | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const reset = () => (setParsed(null), setRows([]), setConflicts([]), setError(null), setResult(null));

  async function pick(file: File) {
    reset();
    try {
      const sheets = await readXlsx(await file.arrayBuffer());
      const ok = sheets.map(parseSheet).filter((s): s is ParsedSheet => s !== null && s.rows.length > 0);
      if (ok.length === 0) throw new Error('ไม่พบตารางที่มีคอลัมน์ "รหัส" และ "ชื่ออะไหล่" ในไฟล์นี้');
      const merged = mergeRows(ok);
      setParsed(ok);
      setRows(merged.rows);
      setConflicts(merged.conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < rows.length; i += 500) {
        const res = await api<{ data: { created: number; updated: number; skipped: unknown[] } }>("/api/parts/import", {
          method: "POST",
          body: { rows: rows.slice(i, i + 500) },
        });
        created += res.data.created;
        updated += res.data.updated;
        skipped += res.data.skipped.length;
      }
      setResult({ created, updated, skipped });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && (reset(), onClose())} title="นำเข้าอะไหล่จาก Excel" className="max-w-2xl">
      <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto text-sm">
        <p className="text-muted-foreground">
          ไฟล์ .xlsx ที่มีหัวคอลัมน์อย่างน้อย <strong>รหัส</strong> และ <strong>ชื่ออะไหล่</strong> (มีได้เพิ่ม: ราคาขาย, ราคาทุน, หมวด, รุ่นเครื่อง, หน่วย, คงเหลือ, หมายเหตุ) ·
          รหัสที่มีอยู่แล้วจะถูกอัปเดต · ไม่เปลี่ยนจำนวนสต็อกของอะไหล่ที่มีอยู่แล้ว
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {parsed && (
          <>
            <ul className="rounded-md border">
              {parsed.map((s) => (
                <li key={s.sheet} className="border-b px-3 py-2 last:border-0">
                  แผ่น <strong>{s.sheet}</strong>: {s.rows.length} แถว · ใช้คอลัมน์{" "}
                  {Object.entries(s.columns)
                    .map(([f, h]) => `${h}→${f}`)
                    .join(", ")}
                  {s.warnings.map((w) => (
                    <p key={w} className="text-xs text-amber-700">
                      {w}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            <p>
              รวมเป็น <strong>{rows.length}</strong> รหัส (รหัสที่ซ้ำกันหลายแผ่นรวมเป็นรายการเดียว รุ่นเครื่องต่อกัน)
            </p>
            {conflicts.length > 0 && (
              <details className="rounded-md bg-amber-500/10 px-3 py-2 text-amber-900">
                <summary>{conflicts.length} รหัสมีชื่อไม่ตรงกันในไฟล์ (ใช้ชื่อแรก)</summary>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
            )}
            {!rows.some((r) => r.sellPrice) && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-amber-900">ไฟล์นี้ไม่มีราคาขายเป็นบาท — อะไหล่จะขึ้น &quot;ยังไม่ตั้ง&quot; ให้กรอกราคาทีหลัง</p>
            )}
          </>
        )}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">{error}</p>}
        {result && (
          <p className="rounded-md bg-green-600/10 px-3 py-2 text-green-800">
            นำเข้าแล้ว: เพิ่มใหม่ {result.created} · อัปเดต {result.updated}
            {result.skipped ? ` · ข้าม ${result.skipped}` : ""}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => (reset(), onClose())} disabled={busy}>
            ปิด
          </Button>
          <Button onClick={run} disabled={busy || rows.length === 0 || result !== null}>
            {busy && <Loader2 className="animate-spin" />} นำเข้า {rows.length > 0 ? `${rows.length} รายการ` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
