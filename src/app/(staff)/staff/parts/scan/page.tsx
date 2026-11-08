"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ScanBarcode } from "lucide-react";

import { ApiError, api, apiData } from "@/lib/api";
import { getEmployee } from "@/lib/auth";
import type { Part } from "@/lib/parts";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckItem } from "@/components/staff/form-bits";
import { PartForm } from "@/components/parts/part-form";
import { StockBox } from "@/components/parts/stock-box";

interface ScanEntry {
  code: string;
  at: Date;
  result: "added" | "found" | "new" | "error";
  part?: Part;
  message?: string;
}

/**
 * หน้ายิงบาร์โค้ด: เครื่องยิง USB พิมพ์รหัสแล้วกด Enter ให้เอง ช่องรับรหัสจึงพร้อมรับตลอด
 * - เจอในระบบ + โหมด "นับรับเข้า" → +1 สต็อกอัตโนมัติ
 * - ยังไม่มีในระบบ → ฟอร์มเพิ่มอะไหล่ใหม่ (กรอกรหัสไว้ให้)
 */
export default function PartScanPage() {
  const role = getEmployee()?.role;
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [countIn, setCountIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Part | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);

  const focus = () => {
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  useEffect(() => focus(), []);

  if (role && role !== "ADMIN" && role !== "RECEPTIONIST") {
    return <p className="text-sm text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบและพนักงานหน้าร้าน</p>;
  }

  const log = (e: ScanEntry) => setHistory((h) => [e, ...h].slice(0, 30));

  async function scan(raw: string) {
    const c = raw.trim();
    if (!c) return;
    setCode("");
    setBusy(true);
    setNewCode(null);
    try {
      const part = await apiData<Part>(`/api/parts/by-code/${encodeURIComponent(c)}`);
      if (countIn) {
        const res = await api<{ data: Part }>(`/api/parts/${part.id}/stock`, { method: "POST", body: { change: 1, reason: "SCAN_IN" } });
        setCurrent(res.data);
        log({ code: c, at: new Date(), result: "added", part: res.data });
      } else {
        setCurrent(part);
        log({ code: c, at: new Date(), result: "found", part });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCurrent(null);
        setNewCode(c);
        log({ code: c, at: new Date(), result: "new" });
      } else {
        log({ code: c, at: new Date(), result: "error", message: err instanceof Error ? err.message : "ผิดพลาด" });
      }
    } finally {
      setBusy(false);
      focus();
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="กลับ">
          <Link href="/staff/parts">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">ยิงบาร์โค้ดอะไหล่</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              scan(code);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <ScanBarcode className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ยิงบาร์โค้ด หรือพิมพ์รหัสแล้วกด Enter"
                className="h-14 pl-11 font-mono text-lg"
                autoComplete="off"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-14" disabled={busy || !code.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : "ค้นหา"}
            </Button>
          </form>
          <CheckItem checked={countIn} onChange={(c) => (setCountIn(c), focus())}>
            โหมดนับรับเข้า — ยิง 1 ครั้ง = เพิ่มสต็อก 1 {countIn ? "(เปิด)" : "(ปิด: ดูข้อมูลอย่างเดียว)"}
          </CheckItem>
          <p className="text-xs text-muted-foreground">ถ้ายิงแล้วไม่มีอะไรเกิดขึ้น ให้คลิกที่ช่องด้านบนก่อน (ช่องต้องถูกเลือกอยู่)</p>
        </CardContent>
      </Card>

      {newCode && (
        <Card className="border-amber-400">
          <CardHeader>
            <CardTitle>รหัสใหม่ <span className="font-mono">{newCode}</span> — เพิ่มอะไหล่เข้าระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <PartForm
              key={newCode}
              initialCode={newCode}
              onSaved={(p) => {
                setNewCode(null);
                setCurrent(p);
                log({ code: p.code, at: new Date(), result: "added", part: p });
                focus();
              }}
              onCancel={() => (setNewCode(null), focus())}
            />
          </CardContent>
        </Card>
      )}

      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-2">
              {current.name} <span className="font-mono text-sm font-normal text-muted-foreground">{current.code}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {current.sellPrice ? `ราคาขาย ${formatMoney(current.sellPrice)} บาท` : "ยังไม่ตั้งราคาขาย"}
              {current.machineModels ? ` · ใช้กับ ${current.machineModels}` : ""}
            </p>
          </CardHeader>
          <CardContent>
            <StockBox key={`${current.id}-${current.stockQty}`} part={current} onChange={setCurrent} />
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ยิงล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="font-mono">{h.code}</span>
                  <span className="min-w-0 flex-1 truncate">{h.part?.name ?? h.message ?? ""}</span>
                  <span
                    className={
                      h.result === "added" ? "text-green-700" : h.result === "new" ? "text-amber-700" : h.result === "error" ? "text-destructive" : "text-muted-foreground"
                    }
                  >
                    {h.result === "added" ? `+1 → ${h.part?.stockQty}` : h.result === "new" ? "รหัสใหม่" : h.result === "error" ? "ผิดพลาด" : "ดูข้อมูล"}
                  </span>
                  <span className="text-xs text-muted-foreground">{h.at.toLocaleTimeString("th-TH")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
