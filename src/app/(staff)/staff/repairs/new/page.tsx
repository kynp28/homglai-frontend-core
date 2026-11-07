"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Save, X } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { getEmployee } from "@/lib/auth";
import {
  ACCESSORY_KEYS,
  ACCESSORY_LABEL_TH,
  BILLING_LABEL_TH,
  CARE_ADVICE_LABEL_TH,
  WARRANTY_LABEL_TH,
  type AccessoryKey,
  type BillingType,
  type CareAdvice,
  type CreateRepairInput,
  type SymptomCategory,
  type WarrantyStatus,
} from "@/lib/types";
import { todayBangkok } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckItem, Field, Section, selectClass } from "@/components/staff/form-bits";

const emptyAccessories = Object.fromEntries(ACCESSORY_KEYS.map((k) => [k, false])) as Record<AccessoryKey, boolean>;

/** ช่องว่างให้เป็น null เพื่อให้ backend เก็บค่าว่างได้ถูกต้อง */
const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

export default function NewRepairPage() {
  const router = useRouter();
  const role = getEmployee()?.role;

  // ใบรับเครื่อง
  const [receivedDate, setReceivedDate] = useState(todayBangkok());
  const [paperBookNo, setPaperBookNo] = useState("");
  const [paperReceiptNo, setPaperReceiptNo] = useState("");
  // ลูกค้า
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // เครื่อง
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  // อาการ
  const [categories, setCategories] = useState<SymptomCategory[] | null>(null);
  const [symptomIds, setSymptomIds] = useState<number[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");
  // อุปกรณ์ที่รับมา
  const [accessories, setAccessories] = useState(emptyAccessories);
  const [accessoryOther, setAccessoryOther] = useState("");
  // ประกัน / ค่าบริการ
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus | "">("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [billingType, setBillingType] = useState<BillingType | "">("");
  // เครื่องสำรอง / คำแนะนำ
  const [loanerMachine, setLoanerMachine] = useState(false);
  const [loanerNote, setLoanerNote] = useState("");
  const [careAdvice, setCareAdvice] = useState<CareAdvice>({ cleanAfterUse: false, noOverload: false });
  const [warningNote, setWarningNote] = useState("");
  // รูป
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiData<SymptomCategory[]>("/api/symptoms")
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดรายการอาการไม่สำเร็จ"));
  }, []);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (role && role !== "RECEPTIONIST" && role !== "ADMIN") {
    return <p className="text-sm text-muted-foreground">หน้านี้สำหรับพนักงานรับเครื่องและผู้ดูแลระบบเท่านั้น</p>;
  }

  function toggleSymptom(id: number, checked: boolean) {
    setSymptomIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (symptomIds.length === 0) {
      setError("กรุณาเลือกอาการเสียอย่างน้อย 1 อาการ");
      return;
    }
    if (warrantyStatus === "IN_WARRANTY" && !warrantyExpiryDate) {
      setError("กรุณาระบุวันหมดประกัน");
      return;
    }

    const body: CreateRepairInput = {
      customer: { name: customerName.trim(), phone: phone.trim(), address: orNull(address) },
      machine: { brand: brand.trim(), model: model.trim(), serialNumber: orNull(serialNumber) },
      symptomIds,
      otherSymptom: orNull(otherSymptom),
      receivedDate,
      paperBookNo: orNull(paperBookNo),
      paperReceiptNo: orNull(paperReceiptNo),
      warrantyStatus: warrantyStatus || null,
      warrantyExpiryDate: warrantyStatus === "IN_WARRANTY" ? warrantyExpiryDate : null,
      billingType: billingType || null,
      accessories: { ...accessories, other: orNull(accessoryOther) },
      loanerMachine,
      loanerNote: loanerMachine ? orNull(loanerNote) : null,
      careAdvice,
      warningNote: orNull(warningNote),
    };

    setSubmitting(true);
    try {
      const order = await apiData<{ id: number; jobNumber: string }>("/api/repairs", { method: "POST", body });
      if (files.length > 0) {
        const form = new FormData();
        form.append("kind", "INTAKE");
        files.forEach((f) => form.append("files", f));
        try {
          await api(`/api/repairs/${order.id}/images`, { method: "POST", body: form });
        } catch {
          // ใบงานสร้างแล้ว — ไม่ให้รูปที่อัปโหลดไม่ผ่านทำให้ผู้ใช้กดสร้างซ้ำ
          router.replace(`/staff/repairs/${order.id}?imageError=1`);
          return;
        }
      }
      router.replace(`/staff/repairs/${order.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="กลับ">
          <Link href="/staff">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">เปิดใบงานซ่อมใหม่</h1>
      </div>

      <Section title="ใบรับเครื่อง">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="วันที่รับเครื่อง" htmlFor="receivedDate" required>
            <Input id="receivedDate" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} required />
          </Field>
          <Field label="เล่มที่" htmlFor="paperBookNo">
            <Input id="paperBookNo" value={paperBookNo} onChange={(e) => setPaperBookNo(e.target.value)} maxLength={20} />
          </Field>
          <Field label="เลขที่ใบรับเครื่อง" htmlFor="paperReceiptNo" hint="ตัวเลข 1–10 หลัก">
            <Input
              id="paperReceiptNo"
              inputMode="numeric"
              value={paperReceiptNo}
              onChange={(e) => setPaperReceiptNo(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
            />
          </Field>
        </div>
      </Section>

      <Section title="ลูกค้า">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อลูกค้า / ร้าน" htmlFor="customerName" required>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </Field>
          <Field label="เบอร์โทร" htmlFor="phone" required hint="9–10 หลัก">
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812345678"
              required
            />
          </Field>
          <Field label="ที่อยู่" htmlFor="address" className="sm:col-span-2">
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </Field>
        </div>
      </Section>

      <Section title="เครื่อง">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="ยี่ห้อ" htmlFor="brand" required>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="LEHEHE" required />
          </Field>
          <Field label="รุ่น" htmlFor="model" required>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} required />
          </Field>
          <Field label="Serial Number" htmlFor="serialNumber">
            <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="อาการเสีย" description="เลือกได้หลายอาการ (อย่างน้อย 1)">
        {!categories && <Loader2 className="animate-spin text-muted-foreground" />}
        {categories?.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">{cat.name}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {cat.symptoms.map((s) => (
                <CheckItem key={s.id} checked={symptomIds.includes(s.id)} onChange={(c) => toggleSymptom(s.id, c)}>
                  {s.name}
                </CheckItem>
              ))}
            </div>
          </div>
        ))}
        <Field label="อาการอื่น ๆ / รายละเอียดเพิ่มเติม" htmlFor="otherSymptom">
          <Textarea id="otherSymptom" value={otherSymptom} onChange={(e) => setOtherSymptom(e.target.value)} rows={2} />
        </Field>
      </Section>

      <Section title="อุปกรณ์ที่รับมากับเครื่อง">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACCESSORY_KEYS.map((k) => (
            <CheckItem key={k} checked={accessories[k]} onChange={(c) => setAccessories((a) => ({ ...a, [k]: c }))}>
              {ACCESSORY_LABEL_TH[k]}
            </CheckItem>
          ))}
        </div>
        <Field label="อื่น ๆ" htmlFor="accessoryOther">
          <Input id="accessoryOther" value={accessoryOther} onChange={(e) => setAccessoryOther(e.target.value)} maxLength={100} />
        </Field>
      </Section>

      <Section title="ประกันและค่าบริการ">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="สถานะประกัน" htmlFor="warrantyStatus">
            <select
              id="warrantyStatus"
              className={selectClass}
              value={warrantyStatus}
              onChange={(e) => setWarrantyStatus(e.target.value as WarrantyStatus | "")}
            >
              <option value="">ไม่ระบุ</option>
              {(Object.keys(WARRANTY_LABEL_TH) as WarrantyStatus[]).map((k) => (
                <option key={k} value={k}>
                  {WARRANTY_LABEL_TH[k]}
                </option>
              ))}
            </select>
          </Field>
          {warrantyStatus === "IN_WARRANTY" && (
            <Field label="วันหมดประกัน" htmlFor="warrantyExpiryDate" required>
              <Input
                id="warrantyExpiryDate"
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                required
              />
            </Field>
          )}
          <Field label="การคิดค่าบริการ" htmlFor="billingType">
            <select
              id="billingType"
              className={selectClass}
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as BillingType | "")}
            >
              <option value="">ไม่ระบุ</option>
              {(Object.keys(BILLING_LABEL_TH) as BillingType[]).map((k) => (
                <option key={k} value={k}>
                  {BILLING_LABEL_TH[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="เครื่องสำรองและคำแนะนำ">
        <div className="flex flex-col gap-3">
          <CheckItem checked={loanerMachine} onChange={setLoanerMachine}>
            ให้ยืมเครื่องสำรอง
          </CheckItem>
          {loanerMachine && (
            <Field label="รายละเอียดเครื่องสำรอง" htmlFor="loanerNote">
              <Input id="loanerNote" value={loanerNote} onChange={(e) => setLoanerNote(e.target.value)} maxLength={500} />
            </Field>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(CARE_ADVICE_LABEL_TH) as Array<keyof CareAdvice>).map((k) => (
            <CheckItem key={k} checked={careAdvice[k]} onChange={(c) => setCareAdvice((a) => ({ ...a, [k]: c }))}>
              {CARE_ADVICE_LABEL_TH[k]}
            </CheckItem>
          ))}
        </div>
        <Field label="หมายเหตุ / ข้อควรระวัง" htmlFor="warningNote">
          <Textarea id="warningNote" value={warningNote} onChange={(e) => setWarningNote(e.target.value)} rows={2} />
        </Field>
      </Section>

      <Section title="รูปเครื่องตอนรับ" description="ไม่บังคับ — ถ่ายสภาพเครื่องไว้เป็นหลักฐาน">
        <div className="flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative size-24 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
                onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                aria-label="ลบรูป"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent">
            <ImagePlus className="size-5" />
            เพิ่มรูป
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setFiles((f) => [...f, ...picked]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Section>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="outline">
          <Link href="/staff">ยกเลิก</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Save />}
          บันทึกใบงาน
        </Button>
      </div>
    </form>
  );
}
