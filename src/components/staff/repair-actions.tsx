"use client";

import { useState } from "react";
import {
  Ban,
  Check,
  CheckCheck,
  Clock,
  Hand,
  Loader2,
  PackageCheck,
  Plus,
  RotateCcw,
  Undo2,
  Wallet,
  Wrench,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  ITEM_TYPE_LABEL_TH,
  PAYMENT_METHOD_LABEL_TH,
  type ItemType,
  type PaymentMethod,
  type RepairDetail,
  type RepairItem,
} from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { CheckItem, Field, selectClass } from "@/components/staff/form-bits";

/** ยอดรวมใบงานที่ต้องโทรยืนยันราคากับลูกค้า (ต้องตรงกับ PRICE_APPROVAL_THRESHOLD ของ backend) */
const PRICE_APPROVAL_THRESHOLD = Number(process.env.NEXT_PUBLIC_PRICE_APPROVAL_THRESHOLD ?? 1000);

type Dialog =
  | "ACCEPT"
  | "RELEASE"
  | "ADD_ITEM"
  | "START_REPAIR"
  | "COMPLETE"
  | "COMPLETE_NOT_REPAIRED"
  | "REWORK"
  | "DELIVER"
  | "RECORD_PAYMENT"
  | "CANCEL"
  | null;

/** เรียก API แล้วจัดการสถานะกำลังทำงาน/ข้อผิดพลาด */
function useRun(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null;
}

function Footer({ busy, onCancel, label, variant }: { busy: boolean; onCancel: () => void; label: string; variant?: "destructive" }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
        ยกเลิก
      </Button>
      <Button type="submit" variant={variant} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

/** ฟอร์มรับเงิน ใช้ทั้งตอนส่งมอบและบันทึกการรับเงิน */
function PaymentFields({
  amount,
  setAmount,
  method,
  setMethod,
  note,
  setNote,
}: {
  amount: string;
  setAmount: (v: string) => void;
  method: PaymentMethod;
  setMethod: (v: PaymentMethod) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="จำนวนเงิน (บาท)" htmlFor="payAmount" required>
        <Input
          id="payAmount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          required
        />
      </Field>
      <Field label="วิธีชำระ" htmlFor="payMethod" required>
        <select id="payMethod" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {(Object.keys(PAYMENT_METHOD_LABEL_TH) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABEL_TH[m]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="หมายเหตุ" htmlFor="payNote" className="sm:col-span-2">
        <Input id="payNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// แผงปุ่มดำเนินการของใบงาน — แสดงเฉพาะปุ่มที่ backend อนุญาต (order.allowedActions)
// ---------------------------------------------------------------------------------------------

export function RepairActionPanel({ order, onDone }: { order: RepairDetail; onDone: () => void }) {
  const can = (a: string) => order.allowedActions.includes(a);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { busy, error, setError, run } = useRun(onDone);
  const base = `/api/repairs/${order.id}`;

  // ค่าในฟอร์มต่าง ๆ
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [item, setItem] = useState({ name: "", itemType: "PART" as ItemType, quantity: "1", unitPrice: "", barcode: "" });
  const [recordPayment, setRecordPayment] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payNote, setPayNote] = useState("");

  function open(d: Exclude<Dialog, null>) {
    setError(null);
    setNote("");
    setSummary("");
    setItem({ name: "", itemType: "PART", quantity: "1", unitPrice: "", barcode: "" });
    setRecordPayment(Number(order.payment.payableAmount) > 0);
    setPayAmount(order.payment.paidAmount ?? order.payment.payableAmount);
    setPayMethod(order.payment.method ?? "CASH");
    setPayNote(order.payment.note ?? "");
    setDialog(d);
  }
  const close = () => !busy && setDialog(null);
  const closeAfter = () => setDialog(null);

  const payment = () => ({ amount: Number(payAmount), method: payMethod, ...(payNote.trim() ? { note: payNote.trim() } : {}) });

  const buttons: Array<{ action: string; label: string; icon: React.ReactNode; variant?: "default" | "outline" | "destructive"; onClick: () => void }> = [
    { action: "ACCEPT", label: "รับงานนี้", icon: <Hand />, onClick: () => open("ACCEPT") },
    { action: "ADD_ITEM", label: "เพิ่มรายการซ่อม", icon: <Plus />, onClick: () => open("ADD_ITEM") },
    { action: "START_REPAIR", label: "เริ่มซ่อม", icon: <Wrench />, onClick: () => open("START_REPAIR") },
    {
      action: "STILL_WORKING",
      label: "ยังซ่อมอยู่",
      icon: <Clock />,
      variant: "outline",
      onClick: () => run(() => api(`${base}/still-working`, { method: "POST" })),
    },
    { action: "COMPLETE", label: "ส่งงานซ่อม", icon: <CheckCheck />, onClick: () => open("COMPLETE") },
    { action: "COMPLETE_NOT_REPAIRED", label: "ลูกค้าไม่ซ่อม", icon: <Undo2 />, variant: "outline", onClick: () => open("COMPLETE_NOT_REPAIRED") },
    { action: "DELIVER", label: "ส่งมอบเครื่อง", icon: <PackageCheck />, onClick: () => open("DELIVER") },
    { action: "RECORD_PAYMENT", label: "บันทึกการรับเงิน", icon: <Wallet />, variant: "outline", onClick: () => open("RECORD_PAYMENT") },
    { action: "REWORK", label: "ส่งกลับไปซ่อมใหม่", icon: <RotateCcw />, variant: "outline", onClick: () => open("REWORK") },
    { action: "RELEASE", label: "ปล่อยงานคืนคิว", icon: <Undo2 />, variant: "outline", onClick: () => open("RELEASE") },
    { action: "CANCEL", label: "ยกเลิกใบงาน", icon: <Ban />, variant: "destructive", onClick: () => open("CANCEL") },
  ];
  const visible = buttons.filter((b) => can(b.action));
  const approvedLeft = order.repairItems.filter((i) => i.status === "APPROVED").length;
  const pendingLeft = order.repairItems.filter((i) => i.status === "PENDING").length;

  if (visible.length === 0 && pendingLeft === 0 && approvedLeft === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {visible.map((b) => (
          <Button key={b.action} variant={b.variant ?? "default"} onClick={b.onClick} disabled={busy}>
            {b.icon}
            {b.label}
          </Button>
        ))}
      </div>
      {can("RESOLVE_ITEM") && pendingLeft > 0 && (
        <p className="text-sm text-amber-800">มี {pendingLeft} รายการรอลูกค้ายืนยันราคา — โทรแจ้งลูกค้าแล้วกดอนุมัติ/ไม่อนุมัติในตารางรายการซ่อม</p>
      )}
      {can("COMPLETE_ITEM") && approvedLeft > 0 && (
        <p className="text-sm text-muted-foreground">มี {approvedLeft} รายการที่อนุมัติแล้ว — กด &quot;ทำเสร็จ&quot; ทีละรายการก่อนส่งงานซ่อม</p>
      )}
      {!dialog && <ErrorText error={error} />}

      <Modal open={dialog === "ACCEPT"} onClose={close} title="รับงานนี้">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/accept`, { method: "POST" }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">ยืนยันรับงาน {order.jobNumber}? สถานะจะเปลี่ยนเป็น &quot;กำลังตรวจเช็ค&quot;</p>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="รับงาน" />
        </form>
      </Modal>

      <Modal open={dialog === "RELEASE"} onClose={close} title="ปล่อยงานคืนคิว">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/release`, { method: "POST" }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">ใบงานจะกลับเข้าคิวกลาง และระบบจะจ่ายให้ช่างคนถัดไป</p>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="ปล่อยงาน" />
        </form>
      </Modal>

      <Modal open={dialog === "ADD_ITEM"} onClose={close} title="เพิ่มรายการซ่อม / ค่าบริการ">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                api(`${base}/items`, {
                  method: "POST",
                  body: {
                    name: item.name.trim(),
                    itemType: item.itemType,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    barcode: item.barcode.trim() || null,
                  },
                }),
              closeAfter,
            );
          }}
          className="flex flex-col gap-3"
        >
          <Field label="ประเภท" htmlFor="itemType" required>
            <select
              id="itemType"
              className={selectClass}
              value={item.itemType}
              onChange={(e) => setItem({ ...item, itemType: e.target.value as ItemType })}
            >
              {(Object.keys(ITEM_TYPE_LABEL_TH) as ItemType[]).map((t) => (
                <option key={t} value={t}>
                  {ITEM_TYPE_LABEL_TH[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="รายการ" htmlFor="itemName" required>
            <Input id="itemName" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} maxLength={191} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={item.itemType === "LABOR_HOURS" ? "จำนวนชั่วโมง" : "จำนวน"} htmlFor="itemQty" required>
              <Input
                id="itemQty"
                inputMode="numeric"
                value={item.quantity}
                onChange={(e) => setItem({ ...item, quantity: e.target.value.replace(/\D/g, "") })}
                required
              />
            </Field>
            <Field label="ราคา/หน่วย (บาท)" htmlFor="itemPrice" required hint={item.itemType === "LABOR_HOURS" ? "ใส่ 0 ได้" : undefined}>
              <Input
                id="itemPrice"
                inputMode="decimal"
                value={item.unitPrice}
                onChange={(e) => setItem({ ...item, unitPrice: e.target.value.replace(/[^\d.]/g, "") })}
                required
              />
            </Field>
          </div>
          <Field label="บาร์โค้ด / รหัสสินค้า" htmlFor="itemBarcode">
            <Input id="itemBarcode" value={item.barcode} onChange={(e) => setItem({ ...item, barcode: e.target.value })} maxLength={64} />
          </Field>
          {item.quantity && item.unitPrice && (() => {
            const amount = Number(item.quantity) * Number(item.unitPrice);
            const current = order.repairItems
              .filter((i) => i.status !== "REJECTED")
              .reduce((sum, i) => sum + Number(i.amount), 0);
            const total = current + amount;
            const needsCall =
              PRICE_APPROVAL_THRESHOLD <= 0 ||
              total >= PRICE_APPROVAL_THRESHOLD ||
              order.repairItems.some((i) => i.status === "PENDING");
            return (
              <p className={needsCall ? "text-sm text-amber-800" : "text-sm text-green-800"}>
                รายการนี้ {formatMoney(amount)} บาท · ยอดรวมใบงาน {formatMoney(total)} บาท —{" "}
                {needsCall ? "ต้องโทรยืนยันราคากับลูกค้า" : "ไม่ถึงเกณฑ์ ระบบอนุมัติให้อัตโนมัติ"}
              </p>
            );
          })()}
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="เพิ่มรายการ" />
        </form>
      </Modal>

      <Modal open={dialog === "START_REPAIR"} onClose={close} title="เริ่มซ่อม">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/status`, { method: "PATCH", body: { status: "REPAIRING", ...(note.trim() ? { note: note.trim() } : {}) } }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">เปลี่ยนสถานะเป็น &quot;กำลังซ่อม&quot; โดยไม่ต้องรอเสนอราคา (เช่น งานในประกัน)</p>
          <Field label="หมายเหตุ" htmlFor="startNote">
            <Input id="startNote" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="เริ่มซ่อม" />
        </form>
      </Modal>

      {(["COMPLETE", "COMPLETE_NOT_REPAIRED"] as const).map((kind) => (
        <Modal
          key={kind}
          open={dialog === kind}
          onClose={close}
          title={kind === "COMPLETE" ? "ส่งงานซ่อม" : "ปิดงาน — ลูกค้าไม่ซ่อม"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  api(`${base}/complete`, {
                    method: "POST",
                    body: { completionSummary: summary.trim(), outcome: kind === "COMPLETE" ? "REPAIRED" : "NOT_REPAIRED" },
                  }),
                closeAfter,
              );
            }}
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-muted-foreground">
              {kind === "COMPLETE"
                ? "สถานะจะเป็น \"ซ่อมเสร็จ\" และแจ้งลูกค้าให้มารับเครื่อง"
                : "ใช้เมื่อตรวจเช็คแล้วลูกค้าไม่ซ่อม — ลูกค้าจะเห็นว่า \"ตรวจเช็คแล้ว ไม่ได้ซ่อม มารับเครื่องคืนได้\""}
            </p>
            <Field label="สรุปงาน" htmlFor={`summary-${kind}`} required>
              <Textarea id={`summary-${kind}`} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={2000} rows={4} required />
            </Field>
            <ErrorText error={error} />
            <Footer busy={busy} onCancel={close} label={kind === "COMPLETE" ? "ส่งงาน" : "ปิดงาน"} />
          </form>
        </Modal>
      ))}

      <Modal open={dialog === "REWORK"} onClose={close} title="ส่งกลับไปซ่อมใหม่">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/status`, { method: "PATCH", body: { status: "REPAIRING", note: note.trim() } }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <Field label="เหตุผล" htmlFor="reworkNote" required>
            <Textarea id="reworkNote" value={note} onChange={(e) => setNote(e.target.value)} rows={3} required />
          </Field>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="ส่งกลับไปซ่อม" />
        </form>
      </Modal>

      <Modal open={dialog === "DELIVER"} onClose={close} title="ส่งมอบเครื่องให้ลูกค้า">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                api(`${base}/status`, {
                  method: "PATCH",
                  body: {
                    status: "DELIVERED",
                    ...(note.trim() ? { note: note.trim() } : {}),
                    ...(recordPayment ? { payment: payment() } : {}),
                  },
                }),
              closeAfter,
            );
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">
            ยอดที่ต้องชำระ <strong>{formatMoney(order.payment.payableAmount)} บาท</strong>
            {order.payment.paidAmount && ` · บันทึกรับแล้ว ${formatMoney(order.payment.paidAmount)} บาท`}
          </p>
          <CheckItem checked={recordPayment} onChange={setRecordPayment}>
            บันทึกการรับเงินพร้อมส่งมอบ
          </CheckItem>
          {recordPayment && (
            <PaymentFields
              amount={payAmount}
              setAmount={setPayAmount}
              method={payMethod}
              setMethod={setPayMethod}
              note={payNote}
              setNote={setPayNote}
            />
          )}
          <Field label="หมายเหตุการส่งมอบ" htmlFor="deliverNote">
            <Input id="deliverNote" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="ยืนยันส่งมอบ" />
        </form>
      </Modal>

      <Modal open={dialog === "RECORD_PAYMENT"} onClose={close} title="บันทึกการรับเงิน">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/payment`, { method: "PUT", body: payment() }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">
            ยอดที่ต้องชำระ <strong>{formatMoney(order.payment.payableAmount)} บาท</strong>
          </p>
          <PaymentFields
            amount={payAmount}
            setAmount={setPayAmount}
            method={payMethod}
            setMethod={setPayMethod}
            note={payNote}
            setNote={setPayNote}
          />
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="บันทึก" />
        </form>
      </Modal>

      <Modal open={dialog === "CANCEL"} onClose={close} title="ยกเลิกใบงาน">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`${base}/status`, { method: "PATCH", body: { status: "CANCELLED", note: note.trim() } }), closeAfter);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-destructive">ยกเลิกแล้วจะเปิดใบงานนี้ต่อไม่ได้</p>
          <Field label="เหตุผลที่ยกเลิก" htmlFor="cancelNote" required>
            <Textarea id="cancelNote" value={note} onChange={(e) => setNote(e.target.value)} rows={3} required />
          </Field>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={close} label="ยกเลิกใบงาน" variant="destructive" />
        </form>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// ปุ่มในแต่ละแถวของตารางรายการซ่อม
// ---------------------------------------------------------------------------------------------

export function ItemActions({ order, item, onDone }: { order: RepairDetail; item: RepairItem; onDone: () => void }) {
  const [resolving, setResolving] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [note, setNote] = useState("");
  const { busy, error, setError, run } = useRun(onDone);
  const base = `/api/repairs/${order.id}/items/${item.id}`;

  const canResolve = order.allowedActions.includes("RESOLVE_ITEM") && item.status === "PENDING";
  const canComplete = order.allowedActions.includes("COMPLETE_ITEM") && item.status === "APPROVED";
  if (!canResolve && !canComplete) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {canResolve && (
          <>
            <Button size="sm" variant="outline" onClick={() => (setError(null), setNote(""), setResolving("APPROVED"))}>
              <Check /> อนุมัติ
            </Button>
            <Button size="sm" variant="outline" onClick={() => (setError(null), setNote(""), setResolving("REJECTED"))}>
              <X /> ไม่อนุมัติ
            </Button>
          </>
        )}
        {canComplete && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api(`${base}/complete`, { method: "PATCH" }))}>
            {busy ? <Loader2 className="animate-spin" /> : <CheckCheck />} ทำเสร็จ
          </Button>
        )}
      </div>
      {!resolving && error && <p className="text-xs text-destructive">{error}</p>}

      <Modal
        open={resolving !== null}
        onClose={() => !busy && setResolving(null)}
        title={resolving === "APPROVED" ? "ลูกค้าอนุมัติราคา" : "ลูกค้าไม่อนุมัติราคา"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => api(`${base}/status`, { method: "PATCH", body: { status: resolving, note: note.trim() || null } }),
              () => setResolving(null),
            );
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm">
            {item.name} × {item.quantity} = <strong>{formatMoney(item.amount)} บาท</strong>
          </p>
          <Field label="บันทึกการโทรคุยกับลูกค้า" htmlFor="resolveNote" hint='เช่น "โทรคุยกับเจ้าของร้าน 14:20"'>
            <Input id="resolveNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          <ErrorText error={error} />
          <Footer busy={busy} onCancel={() => setResolving(null)} label="บันทึก" variant={resolving === "REJECTED" ? "destructive" : undefined} />
        </form>
      </Modal>
    </div>
  );
}
