"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { getEmployee } from "@/lib/auth";
import type { EmployeeRecord, RepairDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CheckItem } from "@/components/staff/form-bits";

/** ตั้งช่างผู้ช่วย — รายชื่อช่างดึงจาก /api/employees ซึ่งเปิดให้เฉพาะ ADMIN */
export function HelpersEditor({ order, onDone }: { order: RepairDetail; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [techs, setTechs] = useState<EmployeeRecord[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order.allowedActions.includes("EDIT_HELPERS") || getEmployee()?.role !== "ADMIN") return null;

  async function start() {
    setError(null);
    setSelected(order.helpers.map((h) => h.technician.id));
    setOpen(true);
    try {
      const all = await apiData<EmployeeRecord[]>("/api/employees");
      setTechs(all.filter((e) => e.role === "TECHNICIAN" && e.isActive && e.id !== order.technician?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายชื่อช่างไม่สำเร็จ");
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/repairs/${order.id}/helpers`, { method: "PUT", body: { technicianIds: selected } });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={start}>
        <Pencil /> แก้ไขช่างผู้ช่วย
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="ช่างผู้ช่วย">
        <div className="flex flex-col gap-3">
          {!techs && !error && <Loader2 className="animate-spin text-muted-foreground" />}
          {techs?.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีช่างคนอื่นให้เลือก</p>}
          <div className="grid gap-2">
            {techs?.map((t) => (
              <CheckItem
                key={t.id}
                checked={selected.includes(t.id)}
                onChange={(c) => setSelected((s) => (c ? [...s, t.id] : s.filter((x) => x !== t.id)))}
              >
                {t.name}
              </CheckItem>
            ))}
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={busy || !techs}>
              {busy && <Loader2 className="animate-spin" />}
              บันทึก
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
