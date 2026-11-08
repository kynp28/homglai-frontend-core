"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import { api } from "@/lib/api";
import type { Part } from "@/lib/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckItem, Field } from "@/components/staff/form-bits";

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s.replace(/,/g, "")));

/** ฟอร์มเพิ่ม/แก้ไขอะไหล่ (รหัสว่าง = ให้ระบบสร้างรหัส HG…) */
export function PartForm({
  part,
  initialCode = "",
  onSaved,
  onCancel,
}: {
  part?: Part;
  initialCode?: string;
  onSaved: (p: Part) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState({
    code: part?.code ?? initialCode,
    name: part?.name ?? "",
    category: part?.category ?? "",
    machineModels: part?.machineModels ?? "",
    unit: part?.unit ?? "ชิ้น",
    sellPrice: part?.sellPrice ?? "",
    costPrice: part?.costPrice ?? "",
    stockQty: "0",
    note: part?.note ?? "",
    isActive: part?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      ...(f.code.trim() ? { code: f.code.trim() } : {}),
      name: f.name.trim(),
      category: f.category.trim() || null,
      machineModels: f.machineModels.trim() || null,
      unit: f.unit.trim() || "ชิ้น",
      sellPrice: numOrNull(String(f.sellPrice)),
      costPrice: numOrNull(String(f.costPrice)),
      note: f.note.trim() || null,
      ...(part ? { isActive: f.isActive } : { stockQty: Math.max(0, Math.floor(Number(f.stockQty) || 0)) }),
    };
    try {
      const res = await api<{ data: Part }>(part ? `/api/parts/${part.id}` : "/api/parts", {
        method: part ? "PATCH" : "POST",
        body,
      });
      onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="รหัส / บาร์โค้ด" htmlFor="pcode" hint={part ? undefined : "เว้นว่างให้ระบบสร้างรหัส HG… ให้"}>
          <Input id="pcode" value={f.code} onChange={set("code")} maxLength={64} className="font-mono" />
        </Field>
        <Field label="หน่วย" htmlFor="punit">
          <Input id="punit" value={f.unit} onChange={set("unit")} maxLength={20} />
        </Field>
      </div>
      <Field label="ชื่ออะไหล่" htmlFor="pname" required>
        <Input id="pname" value={f.name} onChange={set("name")} maxLength={191} required autoFocus={!!initialCode} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ราคาขาย (บาท)" htmlFor="psell">
          <Input id="psell" inputMode="decimal" value={f.sellPrice} onChange={set("sellPrice")} placeholder="ยังไม่ตั้งราคา" />
        </Field>
        <Field label="ราคาทุน (บาท)" htmlFor="pcost">
          <Input id="pcost" inputMode="decimal" value={f.costPrice} onChange={set("costPrice")} />
        </Field>
        <Field label="หมวด" htmlFor="pcat">
          <Input id="pcat" value={f.category} onChange={set("category")} maxLength={100} placeholder="เช่น ปั๊ม, วาล์ว, บอร์ด" />
        </Field>
        <Field label="ใช้กับเครื่องรุ่น" htmlFor="pmodels">
          <Input id="pmodels" value={f.machineModels} onChange={set("machineModels")} maxLength={500} placeholder="เช่น LEHEHE ES-1, ZSP40" />
        </Field>
      </div>
      {!part && (
        <Field label="จำนวนตั้งต้นในสต็อก" htmlFor="pqty">
          <Input id="pqty" inputMode="numeric" value={f.stockQty} onChange={set("stockQty")} />
        </Field>
      )}
      <Field label="หมายเหตุ" htmlFor="pnote">
        <Input id="pnote" value={f.note} onChange={set("note")} maxLength={500} />
      </Field>
      {part && (
        <CheckItem checked={f.isActive} onChange={(c) => setF({ ...f, isActive: c })}>
          ใช้งานอยู่ (ปิด = ซ่อนจากการค้นหา)
        </CheckItem>
      )}
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />} บันทึก
        </Button>
      </div>
    </form>
  );
}
