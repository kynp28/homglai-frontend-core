"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { STOCK_REASON_TH, type Part, type PartStockLog } from "@/lib/parts";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** จำนวนคงเหลือ + ปุ่ม +1/-1/ตั้งค่าตามที่นับได้ + ประวัติ */
export function StockBox({ part, onChange, showLog = true }: { part: Part; onChange: (p: Part) => void; showLog?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState("");
  const [logs, setLogs] = useState<PartStockLog[] | null>(null);

  const loadLogs = useCallback(() => {
    if (!showLog) return;
    apiData<PartStockLog[]>(`/api/parts/${part.id}/stock`).then(setLogs).catch(() => setLogs([]));
  }, [part.id, showLog]);
  useEffect(loadLogs, [loadLogs]);

  async function change(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: Part }>(`/api/parts/${part.id}/stock`, { method: "POST", body });
      onChange(res.data);
      setCount("");
      loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ปรับสต็อกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground">คงเหลือ</p>
          <p className="text-3xl font-semibold tabular-nums">
            {part.stockQty} <span className="text-base font-normal text-muted-foreground">{part.unit}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="ลด 1" disabled={busy || part.stockQty <= 0} onClick={() => change({ change: -1, reason: "ADJUST" })}>
            <Minus />
          </Button>
          <Button variant="outline" size="icon" aria-label="เพิ่ม 1" disabled={busy} onClick={() => change({ change: 1, reason: "ADJUST" })}>
            <Plus />
          </Button>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (count.trim() !== "") change({ set: Math.max(0, Math.floor(Number(count))), reason: "COUNT" });
        }}
      >
        <Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} placeholder="นับได้จริงกี่ชิ้น?" />
        <Button type="submit" variant="secondary" disabled={busy || count === ""}>
          {busy && <Loader2 className="animate-spin" />} ตั้งตามที่นับ
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {showLog && logs && logs.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border text-xs">
          {logs.map((l) => (
            <div key={l.id} className="flex justify-between gap-2 border-b px-3 py-1.5 last:border-0">
              <span>
                <span className={l.change > 0 ? "text-green-700" : "text-destructive"}>{l.change > 0 ? `+${l.change}` : l.change}</span> →{" "}
                {l.qtyAfter} · {STOCK_REASON_TH[l.reason] ?? l.reason}
                {l.note ? ` · ${l.note}` : ""}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {l.employee?.name} · {formatDateTime(l.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
