"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { apiData } from "@/lib/api";
import { getEmployee } from "@/lib/auth";
import { STATUS_LABEL_TH, type Paginated, type RepairOrderSummary, type RepairStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_PAGES = 30; // สูงสุด 3,000 ใบงาน (100 ต่อหน้า)
const OPEN: RepairStatus[] = ["NEW", "INSPECTING", "WAITING_APPROVAL", "REPAIRING"];
const STATUS_ORDER: RepairStatus[] = ["NEW", "INSPECTING", "WAITING_APPROVAL", "REPAIRING", "COMPLETED", "DELIVERED", "CANCELLED"];

const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM (receivedDate เป็นวันที่ล้วน)
const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));

function lastMonths(n: number) {
  const now = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()) + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

/** แท่งแนวนอน (ข้อมูลชุดเดียว สีเดียว) — ชื่อและตัวเลขใช้สีตัวอักษรปกติ */
function HBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_2.5rem] items-center gap-3 text-sm" title={`${r.label}: ${r.value} ใบ`}>
          <span className="truncate">{r.label}</span>
          <span className="h-3 rounded-r-[4px] bg-primary/80" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
          <span className="text-right tabular-nums text-muted-foreground">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** กราฟแท่งแนวตั้งรายเดือน */
function MonthBars({ rows }: { rows: Array<{ key: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-48 items-end gap-2 border-b border-border">
      {rows.map((r) => (
        <div key={r.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(r.key)}: ${r.value} เครื่อง`}>
          <span className="text-xs tabular-nums text-muted-foreground group-hover:text-foreground">{r.value}</span>
          <span
            className="w-full max-w-12 rounded-t-[4px] bg-primary/80 group-hover:bg-primary"
            style={{ height: `${(r.value / max) * 85}%`, minHeight: r.value ? 4 : 0 }}
          />
          <span className="-mb-6 text-xs text-muted-foreground">{monthLabel(r.key)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const role = getEmployee()?.role;
  const [orders, setOrders] = useState<RepairOrderSummary[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all: RepairOrderSummary[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await apiData<Paginated<RepairOrderSummary>>(`/api/repairs?page=${page}&limit=100`);
          all.push(...res.orders);
          totalPages = res.totalPages;
          page++;
        } while (page <= totalPages && page <= MAX_PAGES);
        setTruncated(totalPages > MAX_PAGES);
        setOrders(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!orders) return null;
    const months = lastMonths(6);
    const thisMonth = months[months.length - 1];
    const count = (pred: (o: RepairOrderSummary) => boolean) => orders.filter(pred).length;
    const groupBy = (key: (o: RepairOrderSummary) => string | null | undefined) => {
      const m = new Map<string, number>();
      for (const o of orders) {
        const k = key(o);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    };
    const now = Date.now();
    const stale = orders
      .filter((o) => OPEN.includes(o.status))
      .map((o) => ({ o, days: Math.floor((now - new Date(o.receivedDate).getTime()) / 86400000) }))
      .filter((x) => x.days >= 7)
      .sort((a, b) => b.days - a.days);
    return {
      receivedThisMonth: count((o) => monthKey(o.receivedDate) === thisMonth),
      open: count((o) => OPEN.includes(o.status)),
      readyForPickup: count((o) => o.status === "COMPLETED"),
      delivered: count((o) => o.status === "DELIVERED"),
      cancelled: count((o) => o.status === "CANCELLED"),
      perMonth: months.map((key) => ({ key, value: count((o) => monthKey(o.receivedDate) === key) })),
      byStatus: STATUS_ORDER.map((s) => ({ label: STATUS_LABEL_TH[s], value: count((o) => o.status === s) })),
      byBrand: groupBy((o) => o.machine?.brand?.trim().toUpperCase()).slice(0, 8),
      byTechOpen: groupBy((o) => (OPEN.includes(o.status) ? o.technician?.name ?? "ยังไม่มีช่าง" : null)),
      byTechDone: groupBy((o) => (o.status === "COMPLETED" || o.status === "DELIVERED" ? o.technician?.name : null)),
      stale,
    };
  }, [orders]);

  if (role && role !== "ADMIN" && role !== "RECEPTIONIST") {
    return <p className="text-sm text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบและพนักงานรับเครื่อง</p>;
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!stats) return <Loader2 className="animate-spin text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">ภาพรวมงานซ่อม</h1>
        <p className="text-sm text-muted-foreground">
          จากใบงานทั้งหมด {orders!.length} ใบ{truncated && ` (แสดง ${orders!.length} ใบล่าสุด)`} · สถานะ ณ ตอนนี้
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="รับเครื่องเดือนนี้" value={stats.receivedThisMonth} />
        <Stat label="กำลังดำเนินการ" value={stats.open} hint="รอคิว–กำลังซ่อม" />
        <Stat label="ซ่อมเสร็จ รอลูกค้ารับ" value={stats.readyForPickup} />
        <Stat label="ส่งมอบแล้ว (ทั้งหมด)" value={stats.delivered} />
        <Stat label="ยกเลิก (ทั้งหมด)" value={stats.cancelled} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>รับเครื่องเข้าซ่อม 6 เดือนล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <MonthBars rows={stats.perMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ใบงานตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars rows={stats.byStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ยี่ห้อที่เข้าซ่อมมากที่สุด</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars rows={stats.byBrand} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>งานของช่าง</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium">กำลังถืออยู่</p>
              <HBars rows={stats.byTechOpen} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">ซ่อมเสร็จแล้ว (ทั้งหมด)</p>
              <HBars rows={stats.byTechDone} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>งานค้างนาน (รับเครื่องมาแล้ว 7 วันขึ้นไป ยังไม่เสร็จ)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.stale.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีงานค้างนาน</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">เลขที่ใบงาน</th>
                    <th className="py-2 pr-4 font-medium">เครื่อง</th>
                    <th className="py-2 pr-4 font-medium">ช่าง</th>
                    <th className="py-2 pr-4 font-medium">สถานะ</th>
                    <th className="py-2 pr-4 font-medium">รับเครื่อง</th>
                    <th className="py-2 text-right font-medium">ค้าง (วัน)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.stale.map(({ o, days }) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <a href={`/staff/repairs/${o.id}`} className="font-medium hover:underline">
                          {o.jobNumber}
                        </a>
                      </td>
                      <td className="py-2 pr-4">{o.machine ? `${o.machine.brand} ${o.machine.model}` : "—"}</td>
                      <td className="py-2 pr-4">{o.technician?.name ?? "ยังไม่มีช่าง"}</td>
                      <td className="py-2 pr-4">{STATUS_LABEL_TH[o.status]}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDate(o.receivedDate)}</td>
                      <td className="py-2 text-right tabular-nums">{days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        หมายเหตุ: ตัวเลขนับจากสถานะปัจจุบันของใบงาน · ยอดเงินและจำนวนที่ซ่อมเสร็จรายเดือนต้องเพิ่ม API สรุปที่ backend ภายหลัง
      </p>
    </div>
  );
}
