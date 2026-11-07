"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { api, apiData } from "@/lib/api";
import type { Holiday } from "@/lib/types";
import { formatDate, todayBangkok } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/staff/form-bits";
import { useAction } from "./use-action";

export function HolidaysTab() {
  const [list, setList] = useState<Holiday[] | null>(null);
  const load = useCallback(() => {
    // แสดงตั้งแต่ 30 วันก่อนหน้าเป็นต้นไป
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    apiData<Holiday[]>(`/api/holidays?from=${from}`).then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);
  const { busy, error, run } = useAction(load);
  const [form, setForm] = useState({ date: todayBangkok(), toDate: "", name: "" });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        วันที่ร้านปิดพิเศษ (นอกจากวันหยุดประจำสัปดาห์ของช่าง) — ระบบจะไม่นับวันเหล่านี้ตอนเตือนให้อัปเดตงาน
      </p>
      <form
        className="grid items-end gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_2fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              api("/api/holidays", {
                method: "POST",
                body: { date: form.date, ...(form.toDate ? { toDate: form.toDate } : {}), name: form.name.trim() },
              }),
            () => setForm({ date: todayBangkok(), toDate: "", name: "" }),
          );
        }}
      >
        <Field label="วันที่" htmlFor="hDate" required>
          <Input id="hDate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </Field>
        <Field label="ถึงวันที่ (ถ้าหลายวัน)" htmlFor="hTo">
          <Input id="hTo" type="date" value={form.toDate} min={form.date} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
        </Field>
        <Field label="ชื่อวันหยุด" htmlFor="hName" required>
          <Input id="hName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น สงกรานต์" maxLength={100} required />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} เพิ่ม
        </Button>
      </form>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!list ? (
        <Loader2 className="animate-spin text-muted-foreground" />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีวันหยุดพิเศษ</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>
                <span className="font-medium">{formatDate(h.date)}</span> · {h.name}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                disabled={busy}
                onClick={() => run(() => api(`/api/holidays/${h.id}`, { method: "DELETE" }))}
                aria-label="ลบวันหยุด"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
