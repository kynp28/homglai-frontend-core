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
  type BillingType,
  type CareAdvice,
  type RepairDetail,
  type RepairItem,
} from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";

// ข้อมูลหัวกระดาษ (ตามใบรายงานฝ่ายบริการตัวจริง)
const SHOP_ADDRESS = "101/216 หมู่ 3 ต.เสม็ด อ.เมืองชลบุรี จ.ชลบุรี 20000 โทร. 061-7711139, 085-5555322 ID Line : @homglai";
const COMPLAINT_PHONE = "088-2259059";
const PART_ROWS = 7; // แถว 1–7 อะไหล่ แถว 8–10 ค่าเดินทาง/ชั่วโมง/ค่าบริการ

/** วงกลมช่องติ๊กแบบในใบกระดาษ */
function Mark({ on, children, className }: { on: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className ?? ""}`}>
      <span className="relative top-[2px] inline-flex size-[13px] shrink-0 items-center justify-center rounded-full border border-black text-[10px] leading-none font-bold">
        {on ? "✓" : ""}
      </span>
      {children}
    </span>
  );
}

/** ช่องกรอกแบบเส้นประ: ป้าย + ค่าที่พิมพ์บนเส้น */
function Dotted({ label, children, className }: { label?: string; children?: React.ReactNode; className?: string }) {
  return (
    <span className={`flex min-w-0 items-end gap-1 ${className ?? ""}`}>
      {label && <span className="shrink-0">{label}</span>}
      <span className="min-w-0 flex-1 border-b border-dotted border-black px-1 font-medium text-blue-900 print:text-black">
        {children || " "}
      </span>
    </span>
  );
}

const money = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "" : formatMoney(v));

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
  const symptoms = order.symptoms.map((s) => s.symptom.name).join(", ");

  // ตารางรายการ: แถว 1–7 อะไหล่, 8 ค่าเดินทาง, 9 ชั่วโมง, 10 ค่าบริการ (ตามใบกระดาษ)
  const items = order.repairItems;
  const parts = items.filter((i) => i.itemType === "PART");
  const ofType = (t: RepairItem["itemType"]) => items.filter((i) => i.itemType === t);
  const sumOf = (list: RepairItem[]) => list.reduce((s, i) => s + Number(i.amount), 0);
  const partRows: Array<RepairItem | null> = [...parts, ...Array(Math.max(0, PART_ROWS - parts.length)).fill(null)];
  const travel = ofType("TRAVEL_FEE");
  const labor = ofType("LABOR_HOURS");
  const service = ofType("SERVICE_FEE");
  const rejected = (i: RepairItem) => (i.status === "REJECTED" ? " (ลูกค้าไม่อนุมัติ)" : "");
  const names = (list: RepairItem[]) => list.map((i) => i.name + rejected(i)).join(", ");
  const qty = (list: RepairItem[]) => (list.length ? list.reduce((s, i) => s + i.quantity, 0) : "");
  const unit = (list: RepairItem[]) => (list.length === 1 ? money(list[0].unitPrice) : "");
  const hasItems = items.length > 0;

  const cell = "border border-black px-1.5 py-[3px]";
  const num = `${cell} text-right tabular-nums`;

  return (
    <div className="min-h-dvh bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 8mm; } @media print { body { background: #fff; } }`}</style>

      <div className="mx-auto mb-4 flex max-w-[200mm] items-center justify-between gap-2 px-4 print:hidden">
        <Button asChild variant="ghost">
          <Link href={`/staff/repairs/${order.id}`}>
            <ArrowLeft /> กลับไปที่ใบงาน
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> พิมพ์
        </Button>
      </div>

      <article className="mx-auto flex max-w-[200mm] flex-col gap-[7px] bg-white p-[8mm] text-[12px] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none">
        {/* หัวกระดาษ */}
        <header className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="text-center">
            <p className="text-[20px] leading-none font-bold tracking-wide">หอมไกล</p>
            <p className="text-[9px] tracking-[0.35em]">CHONBURI</p>
            <p className="mt-1 text-[10.5px]">{SHOP_ADDRESS}</p>
            <p className="mt-2 text-[15px] font-bold">ใบรายงานฝ่ายบริการ / SERVICE REPORT</p>
          </div>
          <div className="flex flex-col items-center">
            <QrCode value={trackUrl} size={84} />
            <span className="font-mono text-[10px] font-bold">{order.jobNumber}</span>
            <span className="text-[8.5px]">สแกนติดตามสถานะงานซ่อม</span>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_auto] items-end gap-6">
          <Dotted label="เล่มที่" className="max-w-[45mm] text-[14px]">
            <span className="text-red-700 print:text-red-700">{order.paperBookNo}</span>
          </Dotted>
          <div className="flex w-[70mm] flex-col gap-1">
            <Dotted label="เลขที่" className="text-[14px]">
              <span className="text-red-700 print:text-red-700">{order.paperReceiptNo}</span>
            </Dotted>
            <Dotted label="วันที่รับงาน">{formatDate(order.receivedDate)}</Dotted>
            <Dotted label="ประเภทงาน">ซ่อม</Dotted>
          </div>
        </div>

        {/* ลูกค้า / เครื่อง */}
        <div className="grid grid-cols-[1fr_62mm] gap-4">
          <Dotted label="ชื่อลูกค้า">{order.customer?.name}</Dotted>
          <Dotted label="โทรศัพท์">{order.customer?.phone}</Dotted>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <Dotted label="ที่อยู่">{order.customer?.address}</Dotted>
          <span className="flex gap-3">
            <Mark on={false}>ลูกค้า</Mark>
            <span>We are friends</span>
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <Dotted label="เครื่องยี่ห้อ">{order.machine ? `${order.machine.brand} ${order.machine.model}` : ""}</Dotted>
          <Dotted label="หมายเลขเครื่อง">{order.machine?.serialNumber}</Dotted>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-3">
          <Mark on={order.warrantyStatus === "IN_WARRANTY"}>เครื่องอยู่ในประกัน</Mark>
          <Dotted label="วันหมดประกัน">{order.warrantyExpiryDate ? formatDate(order.warrantyExpiryDate) : ""}</Dotted>
          <Mark on={order.warrantyStatus === "OUT_OF_WARRANTY"}>เครื่องไม่อยู่ในประกัน</Mark>
        </div>
        <div className="grid grid-cols-[3fr_2fr] gap-4">
          <Dotted label="อาการที่ลูกค้าแจ้ง">{symptoms}</Dotted>
          <Dotted label="เพิ่มเติม">{order.otherSymptom}</Dotted>
        </div>

        {/* อุปกรณ์ที่มากับเครื่อง 1–9 */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          <span>อุปกรณ์ที่มากับเครื่อง</span>
          <div className="grid grid-cols-4 gap-x-3 gap-y-1">
            {ACCESSORY_KEYS.map((k, i) => (
              <Mark key={k} on={!!acc[k]}>
                {i + 1}. {ACCESSORY_LABEL_TH[k]}
              </Mark>
            ))}
            <span className="col-span-4 flex items-end gap-1.5">
              <Mark on={!!acc.other}>9. อื่นๆ</Mark>
              <Dotted className="flex-1">{acc.other}</Dotted>
            </span>
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          <Mark on={order.loanerMachine}>รับเครื่องสำรองใช้ระหว่างซ่อม</Mark>
          <Dotted className="flex-1">{order.loanerMachine ? order.loanerNote : ""}</Dotted>
        </div>

        {/* ตารางรายการอะไหล่ */}
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="text-center text-[10.5px] leading-tight">
              <th className={`${cell} w-[11mm] font-medium`}>ลำดับ<br />ITEM</th>
              <th className={`${cell} w-[25mm] font-medium`}>รหัสสินค้า<br />BARCODE</th>
              <th className={`${cell} font-medium`}>รายการอะไหล่ซ่อม<br />DESCRIPTION</th>
              <th className={`${cell} w-[18mm] font-medium`}>จำนวน<br />QUANTITY</th>
              <th className={`${cell} w-[22mm] font-medium`}>ราคา/หน่วย<br />UNIT PRICE</th>
              <th className={`${cell} w-[26mm] font-medium`}>รวมจำนวนเงิน<br />AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {partRows.map((p, i) => (
              <tr key={p?.id ?? `empty-${i}`} className="h-[6.5mm]">
                <td className={`${cell} text-center`}>{i + 1}.</td>
                <td className={`${cell} font-mono text-[10.5px]`}>{p?.barcode}</td>
                <td className={cell}>{p ? p.name + rejected(p) : ""}</td>
                <td className={`${cell} text-center`}>{p?.quantity}</td>
                <td className={num}>{p ? money(p.unitPrice) : ""}</td>
                <td className={num}>{p ? money(p.amount) : ""}</td>
              </tr>
            ))}
            <tr className="h-[6.5mm]">
              <td className={`${cell} text-center`}>{partRows.length + 1}.</td>
              <td className={cell} />
              <td className={cell}>
                ค่าเดินทางนอกสถานที่ <span className="font-medium">{names(travel)}</span>
              </td>
              <td className={`${cell} text-center`}>{qty(travel)}</td>
              <td className={num}>{unit(travel)}</td>
              <td className={num}>{travel.length ? money(sumOf(travel)) : ""}</td>
            </tr>
            <tr className="h-[6.5mm]">
              <td className={`${cell} text-center`}>{partRows.length + 2}.</td>
              <td className={cell} />
              <td className={cell}>
                จำนวนชั่วโมงปฏิบัติการ <span className="font-medium">{labor.length ? qty(labor) : "........"}</span> hr.
              </td>
              <td className={`${cell} text-center`} />
              <td className={num}>{unit(labor)}</td>
              <td className={num}>{labor.length ? money(sumOf(labor)) : ""}</td>
            </tr>
            <tr className="h-[6.5mm]">
              <td className={`${cell} text-center`}>{partRows.length + 3}.</td>
              <td className={cell} />
              <td className={cell}>
                ค่าบริการซ่อม <span className="font-medium">{names(service)}</span>
              </td>
              <td className={`${cell} text-center`}>{qty(service)}</td>
              <td className={num}>{unit(service)}</td>
              <td className={num}>{service.length ? money(sumOf(service)) : ""}</td>
            </tr>
          </tbody>
        </table>

        {/* การคิดเงิน / ข้อแนะนำ / ยอดรวม */}
        <div className="-mt-[7px] grid grid-cols-[1fr_44mm] border border-t-0 border-black">
          <div className="flex flex-col gap-1.5 border-r border-black p-1.5">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {(Object.keys(BILLING_LABEL_TH) as BillingType[]).map((b) => (
                <Mark key={b} on={order.billingType === b}>
                  {BILLING_LABEL_TH[b]}
                </Mark>
              ))}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3">
              <span>ข้อแนะนำการดูแลเครื่องโปรด</span>
              <div className="flex flex-col gap-1">
                {(Object.keys(CARE_ADVICE_LABEL_TH) as Array<keyof CareAdvice>).map((k) => (
                  <Mark key={k} on={!!order.careAdvice?.[k]}>
                    {CARE_ADVICE_LABEL_TH[k]}
                  </Mark>
                ))}
              </div>
            </div>
            <Dotted label="คำเตือน">{order.warningNote}</Dotted>
          </div>
          <div className="grid grid-rows-4 text-[11.5px]">
            <div className="border-b border-black px-1.5 py-1">Sub Total</div>
            <div className="border-b border-black px-1.5 py-1 text-right font-medium tabular-nums">{hasItems ? money(order.totalAmount) : ""}</div>
            <div className="border-b border-black px-1.5 py-1">Grand Total</div>
            <div className="px-1.5 py-1 text-right font-bold tabular-nums">{hasItems ? money(order.totalAmount) : ""}</div>
          </div>
        </div>

        <p className="mt-2">ข้าพเจ้าได้อ่านข้อตกลงจนเข้าใจทุกประการ และยินยอมรับบริการ</p>

        {/* ลายเซ็น */}
        <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-6">
          <Dotted label="ผู้ส่งซ่อม" />
          <Dotted label="พนักงานรับงาน">{receivedBy}</Dotted>
          <span />
          <Dotted label="ผู้ปฏิบัติงาน">{order.technician?.name}</Dotted>
        </div>

        <p className="mt-4 text-center font-medium">กรณีร้องเรียนการบริการ โทร. {COMPLAINT_PHONE}</p>
        <p className="text-center text-[9.5px] text-neutral-600">
          ติดตามสถานะ: {origin.replace(/^https?:\/\//, "")}/track · เลขที่ใบงาน {order.jobNumber} หรือเลขที่ใบรับเครื่อง
        </p>
      </article>
    </div>
  );
}
