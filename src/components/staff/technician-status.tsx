"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff } from "lucide-react";

import { apiData } from "@/lib/api";
import { getToken, saveSession } from "@/lib/auth";
import type { Employee, EmployeeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  AVAILABLE: "ว่าง รอรับงาน",
  RESERVED: "มีงานรอกดรับ",
  BUSY: "กำลังทำงาน",
  OFFLINE: "ไม่อยู่ / ปิดรับงาน",
};

const STATUS_DOT: Record<EmployeeStatus, string> = {
  AVAILABLE: "bg-green-500",
  RESERVED: "bg-amber-500",
  BUSY: "bg-blue-500",
  OFFLINE: "bg-neutral-400",
};

/** แถบสถานะของช่าง: กด "พร้อมรับงาน" แล้วระบบจะจ่ายงานจากคิวให้ทันที */
export function TechnicianStatusBar({
  employee,
  onChange,
  jobHref = (id) => `/staff/repairs/${id}`,
}: {
  employee: Employee;
  onChange: (e: Employee) => void;
  /** ลิงก์ไปหน้าใบงาน (เว็บ หรือหน้าในแอป LINE) */
  jobHref?: (orderId: number) => string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function setStatus(status: "AVAILABLE" | "OFFLINE") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiData<{ employee: Employee; assignedOrder: { id: number; jobNumber: string } | null }>(
        `/api/employees/${employee.id}/status`,
        { method: "PATCH", body: { status } },
      );
      const next = { ...employee, status: res.employee.status };
      const token = getToken();
      if (token) saveSession(token, next);
      onChange(next);
      window.dispatchEvent(new Event("hsc:refresh"));
      if (res.assignedOrder && next.status === "RESERVED") {
        setMessage({ tone: "ok", text: `ได้รับงาน ${res.assignedOrder.jobNumber} — เปิดใบงานแล้วกด "รับงานนี้"` });
        router.push(jobHref(res.assignedOrder.id));
      } else if (status === "AVAILABLE" && next.status === "AVAILABLE") {
        setMessage({ tone: "ok", text: "พร้อมรับงานแล้ว — ตอนนี้ยังไม่มีงานในคิว ระบบจะจ่ายให้เมื่อมีงานเข้า" });
      }
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "เปลี่ยนสถานะไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b bg-secondary/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", STATUS_DOT[employee.status])} />
          สถานะของฉัน: <strong>{STATUS_LABEL[employee.status]}</strong>
        </span>
        <div className="ml-auto flex gap-2">
          {employee.status !== "AVAILABLE" && (
            <Button size="sm" onClick={() => setStatus("AVAILABLE")} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Power />}
              พร้อมรับงาน
            </Button>
          )}
          {employee.status !== "OFFLINE" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("OFFLINE")} disabled={busy}>
              <PowerOff />
              ปิดรับงาน
            </Button>
          )}
        </div>
        {message && (
          <p className={cn("w-full text-xs", message.tone === "error" ? "text-destructive" : "text-green-800")}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
