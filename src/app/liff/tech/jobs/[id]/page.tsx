"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Phone, RefreshCw } from "lucide-react";

import { apiData } from "@/lib/api";
import {
  ACCESSORY_KEYS,
  ACCESSORY_LABEL_TH,
  IMAGE_KIND_LABEL_TH,
  ITEM_STATUS_LABEL_TH,
  ITEM_TYPE_LABEL_TH,
  STATUS_LABEL_TH,
  type RepairDetail,
  type RepairImage,
} from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthImage } from "@/components/staff/auth-image";
import { ItemActions, RepairActionPanel } from "@/components/staff/repair-actions";
import { PhotoUpload } from "@/components/staff/photo-upload";
import { useTechSession } from "@/components/liff/use-tech-session";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** หน้าใบงานในแอปช่าง (เปิดจากการ์ดใน LINE) — ปุ่มทำงานแสดงตามสิทธิ์จาก backend */
export default function LiffJobPage() {
  const { id } = useParams<{ id: string }>();
  const session = useTechSession();
  const [order, setOrder] = useState<RepairDetail | null>(null);
  const [images, setImages] = useState<RepairImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialAction, setInitialAction] = useState<"ADD_ITEM" | "COMPLETE" | null>(null);

  useEffect(() => {
    const step = new URLSearchParams(window.location.search).get("do");
    setInitialAction(step === "add-item" ? "ADD_ITEM" : step === "complete" ? "COMPLETE" : null);
  }, []);

  const load = useCallback(() => {
    apiData<RepairDetail>(`/api/repairs/${id}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดใบงานไม่สำเร็จ"));
    apiData<RepairImage[]>(`/api/repairs/${id}/images`)
      .then(setImages)
      .catch(() => setImages([]));
  }, [id]);

  useEffect(() => {
    if (session.state === "ready") load();
  }, [session.state, load]);

  const back = (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link href="/liff/tech">
        <ArrowLeft /> งานของฉัน
      </Link>
    </Button>
  );

  if (session.state === "loading" || (session.state === "ready" && !order && !error)) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (session.state === "not-linked") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 py-6">
        <p className="text-sm">LINE นี้ยังไม่ได้ผูกกับบัญชีพนักงาน</p>
        <Button asChild>
          <Link href="/liff/tech">ไปผูกบัญชี</Link>
        </Button>
      </main>
    );
  }
  if (session.state === "error" || error || !order) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 py-6">
        {back}
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{session.error ?? error}</p>
      </main>
    );
  }

  const statusLabel =
    order.status === "COMPLETED" && order.repairOutcome === "NOT_REPAIRED" ? "ตรวจเช็คแล้ว ไม่ได้ซ่อม" : STATUS_LABEL_TH[order.status];
  const accessories = ACCESSORY_KEYS.filter((k) => order.accessories?.[k]).map((k) => ACCESSORY_LABEL_TH[k]);
  if (order.accessories?.other) accessories.push(order.accessories.other);
  const canUpload = ["INSPECTING", "WAITING_APPROVAL", "REPAIRING", "COMPLETED"].includes(order.status);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 py-4 pb-10">
      <div className="flex items-center justify-between">
        {back}
        <Button variant="ghost" size="icon" aria-label="โหลดใหม่" onClick={load}>
          <RefreshCw />
        </Button>
      </div>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{order.jobNumber}</h1>
          <Badge>{statusLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {order.machine ? `${order.machine.brand} ${order.machine.model}` : ""}
          {order.machine?.serialNumber ? ` · S/N ${order.machine.serialNumber}` : ""} · รับ {formatDate(order.receivedDate)}
        </p>
      </header>

      {/* ปุ่มทำงานตามสถานะ (ชุดเดียวกับเว็บ) */}
      <RepairActionPanel order={order} onDone={load} initialAction={initialAction} />

      {order.customer && (
        <Block title="ลูกค้า">
          <p className="font-medium">{order.customer.name}</p>
          {order.customer.phone && (
            <Button asChild variant="outline" className="self-start">
              <a href={`tel:${order.customer.phone}`}>
                <Phone /> โทร {order.customer.phone}
              </a>
            </Button>
          )}
        </Block>
      )}

      <Block title="อาการที่ลูกค้าแจ้ง">
        <div className="flex flex-wrap gap-1.5">
          {order.symptoms.map((s) => (
            <Badge key={s.symptom.id} variant="secondary">
              {s.symptom.name}
            </Badge>
          ))}
        </div>
        {order.otherSymptom && <p className="text-sm whitespace-pre-line">{order.otherSymptom}</p>}
        {accessories.length > 0 && <p className="text-xs text-muted-foreground">อุปกรณ์ที่มากับเครื่อง: {accessories.join(", ")}</p>}
        {order.warningNote && <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-900">หมายเหตุ: {order.warningNote}</p>}
      </Block>

      <Block title="รายการซ่อม">
        {order.repairItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีรายการ — กด &quot;เพิ่มรายการซ่อม&quot; ด้านบน</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {order.repairItems.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-2">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ITEM_TYPE_LABEL_TH[item.itemType]} · {item.quantity} × {formatMoney(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{formatMoney(item.amount)}</p>
                    <Badge variant="secondary">{ITEM_STATUS_LABEL_TH[item.status]}</Badge>
                  </div>
                </div>
                <ItemActions order={order} item={item} onDone={load} />
              </li>
            ))}
            <li className="flex justify-between pt-2 text-sm font-semibold">
              <span>รวม</span>
              <span className="tabular-nums">{formatMoney(order.totalAmount)} บาท</span>
            </li>
          </ul>
        )}
      </Block>

      <Block title="รูปภาพ">
        {canUpload && <PhotoUpload orderId={order.id} onDone={load} />}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="flex flex-col gap-1">
                <AuthImage path={`/api/repairs/${order.id}/images/${img.id}`} alt={IMAGE_KIND_LABEL_TH[img.kind]} className="aspect-square w-full" />
                <span className="text-[10px] text-muted-foreground">{IMAGE_KIND_LABEL_TH[img.kind]}</span>
              </div>
            ))}
          </div>
        )}
      </Block>
    </main>
  );
}
