"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { ApiError, apiData } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  ACCESSORY_KEYS,
  ACCESSORY_LABEL_TH,
  BILLING_LABEL_TH,
  CARE_ADVICE_LABEL_TH,
  WARRANTY_LABEL_TH,
  type CareAdvice,
  type RepairDetail,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-neutral-400 py-1">
      <span className="shrink-0 text-neutral-600">{label}</span>
      <span className="min-w-0 flex-1 font-medium break-words">{children || "—"}</span>
    </div>
  );
}

function Box({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex size-3.5 items-center justify-center border border-neutral-700 text-[10px] leading-none">{checked ? "✓" : ""}</span>
      {children}
    </span>
  );
}

/** ใบรับเครื่องสำหรับพิมพ์ (A4 ครึ่งบน / A5) พร้อม QR ไปหน้าเช็กสถานะ */
export default function PrintReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<RepairDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiData<RepairDetail>(`/api/repairs/${id}`)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      });
  }, [id, router]);

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!order || !origin) return <Loader2 className="m-6 animate-spin text-muted-foreground" />;

  const trackUrl = `${origin}/track?q=${encodeURIComponent(order.jobNumber)}`;
  const receivedBy = order.statusLogs.find((l) => l.changedBy)?.changedBy?.name;
  const acc = order.accessories ?? {};

  return (
    <div className="min-h-dvh bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 10mm; } @media print { body { background: #fff; } }`}</style>

      <div className="mx-auto mb-4 flex max-w-[190mm] items-center justify-between gap-2 px-4 print:hidden">
        <Button asChild variant="ghost">
          <Link href={`/staff/repairs/${order.id}`}>
            <ArrowLeft /> กลับไปที่ใบงาน
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> พิมพ์
        </Button>
      </div>

      <article className="mx-auto max-w-[190mm] bg-white p-[8mm] text-[12px] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-[15px] font-bold">บริษัท หอมไกล ชลบุรี จำกัด</p>
            <p className="text-[18px] font-bold">ใบรับเครื่องซ่อม</p>
            <p className="mt-1 text-neutral-700">
              เลขที่ใบงาน <span className="font-mono text-[16px] font-bold text-black">{order.jobNumber}</span>
            </p>
            <p className="text-neutral-700">
              เล่มที่ {order.paperBookNo || "—"} · เลขที่ {order.paperReceiptNo || "—"} · วันที่รับ {formatDate(order.receivedDate)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <QrCode value={trackUrl} size={104} />
            <span className="text-[10px] text-neutral-700">สแกนเพื่อติดตามสถานะงานซ่อม</span>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-2 gap-x-6">
          <div>
            <p className="mb-1 font-bold">ลูกค้า</p>
            <Line label="ชื่อ">{order.customer?.name}</Line>
            <Line label="โทร">{order.customer?.phone}</Line>
            <Line label="ที่อยู่">{order.customer?.address}</Line>
          </div>
          <div>
            <p className="mb-1 font-bold">เครื่อง</p>
            <Line label="ยี่ห้อ / รุ่น">{order.machine ? `${order.machine.brand} ${order.machine.model}` : ""}</Line>
            <Line label="หมายเลขเครื่อง">{order.machine?.serialNumber}</Line>
            <Line label="ประกัน">
              {order.warrantyStatus ? WARRANTY_LABEL_TH[order.warrantyStatus] : ""}
              {order.warrantyExpiryDate ? ` (ถึง ${formatDate(order.warrantyExpiryDate)})` : ""}
            </Line>
          </div>
        </section>

        <section className="mt-3">
          <p className="mb-1 font-bold">อาการที่ลูกค้าแจ้ง</p>
          <p>{order.symptoms.map((s) => s.symptom.name).join(", ") || "—"}</p>
          {order.otherSymptom && <p className="mt-1 whitespace-pre-line">เพิ่มเติม: {order.otherSymptom}</p>}
        </section>

        <section className="mt-3">
          <p className="mb-1 font-bold">อุปกรณ์ที่มากับเครื่อง</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ACCESSORY_KEYS.map((k) => (
              <Box key={k} checked={!!acc[k]}>
                {ACCESSORY_LABEL_TH[k]}
              </Box>
            ))}
            <Box checked={!!acc.other}>อื่น ๆ {acc.other ? `: ${acc.other}` : ""}</Box>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-x-6">
          <div>
            <Line label="การคิดค่าบริการ">{order.billingType ? BILLING_LABEL_TH[order.billingType] : ""}</Line>
            <Line label="เครื่องสำรอง">{order.loanerMachine ? order.loanerNote || "ให้ยืม" : "ไม่มี"}</Line>
          </div>
          <div>
            <p className="mb-1 font-bold">ข้อแนะนำการดูแลเครื่อง</p>
            <div className="flex flex-col gap-1">
              {(Object.keys(CARE_ADVICE_LABEL_TH) as Array<keyof CareAdvice>).map((k) => (
                <Box key={k} checked={!!order.careAdvice?.[k]}>
                  {CARE_ADVICE_LABEL_TH[k]}
                </Box>
              ))}
            </div>
          </div>
        </section>

        {order.warningNote && (
          <section className="mt-3">
            <p className="mb-1 font-bold">หมายเหตุ / คำเตือน</p>
            <p className="whitespace-pre-line">{order.warningNote}</p>
          </section>
        )}

        <section className="mt-4 rounded border border-black p-2 text-[11px]">
          <p>• กรุณาเก็บใบนี้ไว้ และนำมาแสดงเมื่อรับเครื่องคืน</p>
          <p>
            • ติดตามสถานะได้ที่ <span className="font-mono">{origin.replace(/^https?:\/\//, "")}/track</span> ด้วยเลขที่ใบงาน{" "}
            <span className="font-mono font-bold">{order.jobNumber}</span> หรือเลขที่ใบรับเครื่อง
          </p>
          <p>• ร้านจะโทรแจ้งราคาก่อนซ่อม เมื่อค่าใช้จ่ายรวมตั้งแต่ 1,000 บาทขึ้นไป</p>
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-10 text-center">
          <div>
            <div className="border-b border-black pb-6" />
            <p className="mt-1">ลูกค้า / ผู้ส่งซ่อม</p>
          </div>
          <div>
            <div className="border-b border-black pb-6" />
            <p className="mt-1">พนักงานรับเครื่อง{receivedBy ? ` (${receivedBy})` : ""}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
