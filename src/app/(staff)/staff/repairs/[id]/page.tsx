"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { ApiError, apiData } from "@/lib/api";
import {
  ACCESSORY_KEYS,
  ACCESSORY_LABEL_TH,
  BILLING_LABEL_TH,
  CARE_ADVICE_LABEL_TH,
  IMAGE_KIND_LABEL_TH,
  ITEM_STATUS_LABEL_TH,
  ITEM_TYPE_LABEL_TH,
  PAYMENT_METHOD_LABEL_TH,
  ROLE_LABEL_TH,
  STATUS_LABEL_TH,
  WARRANTY_LABEL_TH,
  type CareAdvice,
  type RepairDetail,
  type RepairImage,
} from "@/lib/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthImage } from "@/components/staff/auth-image";
import { ItemActions, RepairActionPanel } from "@/components/staff/repair-actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? "—"}</dd>
    </div>
  );
}

export default function RepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // ข้อความแจ้งหลังเปิดใบงาน (?created=1 / ?imageError=1)
  const [flash, setFlash] = useState<"created" | "imageError" | null>(null);
  const [order, setOrder] = useState<RepairDetail | null>(null);
  const [images, setImages] = useState<RepairImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFlash(q.get("imageError") ? "imageError" : q.get("created") ? "created" : null);
  }, []);

  const load = useCallback(() => {
    apiData<RepairDetail>(`/api/repairs/${id}`)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      });
    apiData<RepairImage[]>(`/api/repairs/${id}/images`)
      .then(setImages)
      .catch(() => setImages([]));
  }, [id, router]);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/staff">กลับหน้ารายการ</Link>
        </Button>
      </div>
    );
  }
  if (!order) return <Loader2 className="animate-spin text-muted-foreground" />;

  const statusLabel =
    order.status === "COMPLETED" && order.repairOutcome === "NOT_REPAIRED"
      ? "ตรวจเช็คแล้ว ไม่ได้ซ่อม"
      : STATUS_LABEL_TH[order.status];
  const accessoryList = ACCESSORY_KEYS.filter((k) => order.accessories?.[k]).map((k) => ACCESSORY_LABEL_TH[k]);
  if (order.accessories?.other) accessoryList.push(order.accessories.other);
  const adviceList = (Object.keys(CARE_ADVICE_LABEL_TH) as Array<keyof CareAdvice>)
    .filter((k) => order.careAdvice?.[k])
    .map((k) => CARE_ADVICE_LABEL_TH[k]);
  const symptomsByCategory = order.symptoms.reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.symptom.category?.name ?? "อาการ";
    (acc[cat] ??= []).push(s.symptom.name);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="กลับ">
          <Link href="/staff">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{order.jobNumber}</h1>
        <Badge>{statusLabel}</Badge>
        <span className="text-sm text-muted-foreground">รับเครื่อง {formatDate(order.receivedDate)}</span>
      </div>

      {flash === "created" && (
        <p className="flex items-center gap-2 rounded-md bg-green-600/10 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="size-4" /> เปิดใบงานเรียบร้อยแล้ว
        </p>
      )}
      {flash === "imageError" && (
        <p className="flex items-center gap-2 rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert className="size-4" /> เปิดใบงานแล้ว แต่อัปโหลดรูปไม่สำเร็จ
        </p>
      )}

      <RepairActionPanel order={order} onDone={load} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ลูกค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="ชื่อ">{order.customer?.name}</Row>
                  {order.customer?.phone !== undefined && <Row label="เบอร์โทร">{order.customer.phone}</Row>}
                  {order.customer?.address !== undefined && <Row label="ที่อยู่">{order.customer.address || "—"}</Row>}
                  {order.customer?.lineLinked !== undefined && (
                    <Row label="LINE">{order.customer.lineLinked ? "ผูกแล้ว" : "ยังไม่ผูก"}</Row>
                  )}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>เครื่อง</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="ยี่ห้อ">{order.machine?.brand}</Row>
                  <Row label="รุ่น">{order.machine?.model}</Row>
                  <Row label="Serial">{order.machine?.serialNumber || "—"}</Row>
                </dl>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>อาการเสีย</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {Object.entries(symptomsByCategory).map(([cat, names]) => (
                <div key={cat}>
                  <p className="mb-1 text-muted-foreground">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {names.map((n) => (
                      <Badge key={n} variant="secondary">
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {order.otherSymptom && <p className="whitespace-pre-line">{order.otherSymptom}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายการซ่อม</CardTitle>
            </CardHeader>
            <CardContent>
              {order.repairItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีรายการซ่อม</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-medium">รายการ</th>
                        <th className="py-2 pr-3 font-medium">ประเภท</th>
                        <th className="py-2 pr-3 text-right font-medium">จำนวน</th>
                        <th className="py-2 pr-3 text-right font-medium">ราคา/หน่วย</th>
                        <th className="py-2 pr-3 text-right font-medium">รวม</th>
                        <th className="py-2 font-medium">สถานะ</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {order.repairItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{item.name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{ITEM_TYPE_LABEL_TH[item.itemType] ?? item.itemType}</td>
                          <td className="py-2 pr-3 text-right">{item.quantity}</td>
                          <td className="py-2 pr-3 text-right">{formatMoney(item.unitPrice)}</td>
                          <td className="py-2 pr-3 text-right">{formatMoney(item.amount)}</td>
                          <td className="py-2">
                            <Badge variant={item.status === "REJECTED" ? "outline" : "secondary"}>
                              {ITEM_STATUS_LABEL_TH[item.status] ?? item.status}
                            </Badge>
                          </td>
                          <td className="py-2 pl-2">
                            <ItemActions order={order} item={item} onDone={load} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="pt-3 text-right text-muted-foreground">
                          รวมทุกรายการ
                        </td>
                        <td className="pt-3 pr-3 text-right font-semibold">{formatMoney(order.totalAmount)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รูปภาพ</CardTitle>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีรูป</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="flex flex-col gap-1">
                      <AuthImage path={`/api/repairs/${order.id}/images/${img.id}`} alt={IMAGE_KIND_LABEL_TH[img.kind]} className="size-28" />
                      <span className="text-xs text-muted-foreground">{IMAGE_KIND_LABEL_TH[img.kind]}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>การมอบหมาย</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Row label="ช่างหลัก">{order.technician?.name ?? "ยังไม่มีช่าง"}</Row>
                <Row label="ช่างผู้ช่วย">
                  {order.helpers.length ? order.helpers.map((h) => h.technician.name).join(", ") : "—"}
                </Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลรับเครื่อง</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Row label="เล่มที่ / เลขที่">
                  {[order.paperBookNo, order.paperReceiptNo].filter(Boolean).join(" / ") || "—"}
                </Row>
                <Row label="ประกัน">
                  {order.warrantyStatus ? WARRANTY_LABEL_TH[order.warrantyStatus] : "—"}
                  {order.warrantyExpiryDate && ` (ถึง ${formatDate(order.warrantyExpiryDate)})`}
                </Row>
                <Row label="ค่าบริการ">{order.billingType ? BILLING_LABEL_TH[order.billingType] : "—"}</Row>
                <Row label="อุปกรณ์ที่รับมา">{accessoryList.length ? accessoryList.join(", ") : "—"}</Row>
                <Row label="เครื่องสำรอง">{order.loanerMachine ? order.loanerNote || "ให้ยืม" : "ไม่มี"}</Row>
                <Row label="คำแนะนำ">{adviceList.length ? adviceList.join(", ") : "—"}</Row>
                <Row label="หมายเหตุ">
                  <span className="whitespace-pre-line">{order.warningNote || "—"}</span>
                </Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>การชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Row label="ยอดที่ต้องชำระ">{formatMoney(order.payment.payableAmount)} บาท</Row>
                <Row label="รับแล้ว">{order.payment.paidAmount ? `${formatMoney(order.payment.paidAmount)} บาท` : "—"}</Row>
                {order.payment.method && <Row label="วิธีชำระ">{PAYMENT_METHOD_LABEL_TH[order.payment.method]}</Row>}
              </dl>
              {order.payment.warning && (
                <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800">{order.payment.warning.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ประวัติสถานะ</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 border-l-2 pl-4">
                {[...order.statusLogs].reverse().map((log, i) => (
                  <li key={log.id} className="relative text-sm">
                    <span
                      className={`absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`}
                    />
                    <p className="font-medium">{STATUS_LABEL_TH[log.status] ?? log.status}</p>
                    {log.note && <p className="text-muted-foreground">{log.note}</p>}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                      {log.changedBy && ` · ${log.changedBy.name} (${ROLE_LABEL_TH[log.changedBy.role] ?? log.changedBy.role})`}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
