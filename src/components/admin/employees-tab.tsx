"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Plus } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { ROLE_LABEL_TH, WEEKDAY_LABEL_TH, type EmployeeRecord, type EmployeeRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CheckItem, Field, selectClass } from "@/components/staff/form-bits";
import { useAction } from "./use-action";

const STATUS_TH: Record<string, string> = { AVAILABLE: "ว่าง", RESERVED: "มีงานรอรับ", BUSY: "กำลังทำงาน", OFFLINE: "ไม่อยู่" };
const ROLES = Object.keys(ROLE_LABEL_TH) as EmployeeRole[];

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null;
}

export function EmployeesTab() {
  const [list, setList] = useState<EmployeeRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    apiData<EmployeeRecord[]>("/api/employees")
      .then(setList)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ"));
  }, []);
  useEffect(load, [load]);

  const { busy, error, setError, run } = useAction(load);
  const [mode, setMode] = useState<"create" | "edit" | "password" | null>(null);
  const [target, setTarget] = useState<EmployeeRecord | null>(null);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "TECHNICIAN" as EmployeeRole, isActive: true, weeklyDayOff: "" });

  function open(m: "create" | "edit" | "password", e?: EmployeeRecord) {
    setError(null);
    setTarget(e ?? null);
    setForm({
      username: e?.username ?? "",
      name: e?.name ?? "",
      password: "",
      role: e?.role ?? "TECHNICIAN",
      isActive: e?.isActive ?? true,
      weeklyDayOff: e?.weeklyDayOff === null || e?.weeklyDayOff === undefined ? "" : String(e.weeklyDayOff),
    });
    setMode(m);
  }
  const close = () => !busy && setMode(null);

  if (loadError) return <ErrorText error={loadError} />;
  if (!list) return <Loader2 className="animate-spin text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => open("create")}>
          <Plus /> เพิ่มพนักงาน
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">ชื่อ</th>
              <th className="px-4 py-2 font-medium">ชื่อผู้ใช้</th>
              <th className="px-4 py-2 font-medium">บทบาท</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 font-medium">วันหยุดประจำ</th>
              <th className="px-4 py-2 font-medium">LINE</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className={`border-b last:border-0 ${e.isActive ? "" : "text-muted-foreground"}`}>
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2">{e.username}</td>
                <td className="px-4 py-2">{ROLE_LABEL_TH[e.role]}</td>
                <td className="px-4 py-2">
                  {e.isActive ? <Badge variant="secondary">{STATUS_TH[e.status] ?? e.status}</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                </td>
                <td className="px-4 py-2">{e.weeklyDayOff === null ? "—" : WEEKDAY_LABEL_TH[e.weeklyDayOff]}</td>
                <td className="px-4 py-2">
                  {e.lineLinked === undefined ? "—" : e.lineLinked ? <Badge variant="secondary">ผูกแล้ว</Badge> : <span className="text-muted-foreground">ยังไม่ผูก</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => open("edit", e)}>
                      <Pencil /> แก้ไข
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => open("password", e)}>
                      <KeyRound /> รีเซ็ตรหัส
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={mode === "create"} onClose={close} title="เพิ่มพนักงาน">
        <form
          className="flex flex-col gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            run(
              () => api("/api/employees", { method: "POST", body: { username: form.username.trim(), name: form.name.trim(), password: form.password, role: form.role } }),
              () => setMode(null),
            );
          }}
        >
          <Field label="ชื่อที่แสดง" htmlFor="empName" required>
            <Input id="empName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
          </Field>
          <Field label="ชื่อผู้ใช้ (ใช้ login)" htmlFor="empUser" required hint="อังกฤษ ตัวเลข - _ อย่างน้อย 3 ตัว">
            <Input id="empUser" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" required />
          </Field>
          <Field label="รหัสผ่านเริ่มต้น" htmlFor="empPass" required hint="อย่างน้อย 12 ตัวอักษร">
            <Input id="empPass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={12} autoComplete="new-password" required />
          </Field>
          <Field label="บทบาท" htmlFor="empRole" required>
            <select id="empRole" className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL_TH[r]}
                </option>
              ))}
            </select>
          </Field>
          <ErrorText error={error} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>ยกเลิก</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}เพิ่ม</Button>
          </div>
        </form>
      </Modal>

      <Modal open={mode === "edit"} onClose={close} title={`แก้ไข ${target?.name ?? ""}`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!target) return;
            run(
              () =>
                api(`/api/employees/${target.id}`, {
                  method: "PATCH",
                  body: {
                    name: form.name.trim(),
                    role: form.role,
                    isActive: form.isActive,
                    weeklyDayOff: form.weeklyDayOff === "" ? null : Number(form.weeklyDayOff),
                  },
                }),
              () => setMode(null),
            );
          }}
        >
          <Field label="ชื่อที่แสดง" htmlFor="editName" required>
            <Input id="editName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="บทบาท" htmlFor="editRole">
              <select id="editRole" className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL_TH[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="วันหยุดประจำสัปดาห์" htmlFor="editDayOff">
              <select id="editDayOff" className={selectClass} value={form.weeklyDayOff} onChange={(e) => setForm({ ...form, weeklyDayOff: e.target.value })}>
                <option value="">ไม่มี</option>
                {WEEKDAY_LABEL_TH.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <CheckItem checked={form.isActive} onChange={(c) => setForm({ ...form, isActive: c })}>
            เปิดใช้งานบัญชี
          </CheckItem>
          {target?.isActive && !form.isActive && (
            <p className="text-xs text-amber-800">ปิดใช้งานแล้ว งานที่ช่างคนนี้ถืออยู่จะกลับเข้าคิวกลางและจ่ายให้ช่างคนอื่น</p>
          )}
          <ErrorText error={error} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>ยกเลิก</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}บันทึก</Button>
          </div>
        </form>
      </Modal>

      <Modal open={mode === "password"} onClose={close} title={`รีเซ็ตรหัสผ่าน ${target?.name ?? ""}`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!target) return;
            run(() => api(`/api/employees/${target.id}/reset-password`, { method: "POST", body: { newPassword: form.password } }), () => setMode(null));
          }}
        >
          <Field label="รหัสผ่านใหม่" htmlFor="newPass" required hint="อย่างน้อย 12 ตัวอักษร — แจ้งพนักงานให้เปลี่ยนเองหลัง login">
            <Input id="newPass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={12} autoComplete="new-password" required />
          </Field>
          <ErrorText error={error} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>ยกเลิก</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}รีเซ็ต</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
