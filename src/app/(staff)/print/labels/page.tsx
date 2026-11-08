"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { apiData } from "@/lib/api";
import type { Part } from "@/lib/parts";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode } from "@/components/barcode";

/** ฉลากบาร์โค้ดอะไหล่บนกระดาษ A4 (3 คอลัมน์) — ?ids=1,2,3 */
export default function LabelsPage() {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [copies, setCopies] = useState("1");
  const [showPrice, setShowPrice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = (new URLSearchParams(window.location.search).get("ids") ?? "").split(",").map(Number).filter((n) => n > 0);
    (async () => {
      // API ไม่มีดึงทีละ id จึงโหลดทั้งหมดแล้วกรอง (อะไหล่หลักร้อย–พันรายการ)
      const all: Part[] = [];
      for (let p = 1; ; p++) {
        const d = await apiData<{ parts: Part[]; totalPages: number }>(`/api/parts?page=${p}&limit=500&includeInactive=true`);
        all.push(...d.parts);
        if (p >= d.totalPages) break;
      }
      setParts(ids.map((id) => all.find((x) => x.id === id)).filter((x): x is Part => !!x));
    })()
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ"));
  }, []);

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!parts) return <Loader2 className="m-6 animate-spin text-muted-foreground" />;
  const n = Math.min(50, Math.max(1, Number(copies) || 1));
  const labels = parts.flatMap((p) => Array.from({ length: n }, () => p));

  return (
    <div className="min-h-dvh bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 8mm; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[194mm] flex-wrap items-center gap-3 px-4 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/staff/parts">
            <ArrowLeft /> กลับ
          </Link>
        </Button>
        <label className="flex items-center gap-2 text-sm">
          ชุดละ
          <Input className="w-16" inputMode="numeric" value={copies} onChange={(e) => setCopies(e.target.value.replace(/\D/g, ""))} />
          ดวง
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> แสดงราคา
        </label>
        <span className="text-sm text-muted-foreground">รวม {labels.length} ดวง</span>
        <Button className="ml-auto" onClick={() => window.print()}>
          <Printer /> พิมพ์
        </Button>
      </div>
      <div className="mx-auto grid max-w-[194mm] grid-cols-3 gap-[2mm] bg-white p-[2mm] print:p-0">
        {labels.map((p, i) => (
          <div key={i} className="flex h-[30mm] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm border border-dashed border-neutral-300 px-1 text-black print:break-inside-avoid">
            <p className="line-clamp-2 text-center text-[9px] leading-tight">{p.name}</p>
            <Barcode value={p.code} height={34} moduleWidth={1.3} />
            <p className="font-mono text-[10px] font-bold">{p.code}</p>
            {showPrice && p.sellPrice && <p className="text-[9px]">ราคา {formatMoney(p.sellPrice)} บาท</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
