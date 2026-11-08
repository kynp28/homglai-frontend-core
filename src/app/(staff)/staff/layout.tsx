"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coffee, LogOut } from "lucide-react";

import { clearSession, getEmployee, getToken, saveSession } from "@/lib/auth";
import { apiData } from "@/lib/api";
import { ROLE_LABEL_TH, type Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TechnicianStatusBar } from "@/components/staff/technician-status";
import { NotificationBell } from "@/components/staff/notification-bell";

// ทุกหน้าใต้ /staff ต้อง login ก่อน (backend ตรวจสิทธิ์ซ้ำทุก request อยู่แล้ว)
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const emp = getEmployee();
    if (!getToken() || !emp) {
      router.replace("/login");
      return;
    }
    setEmployee(emp);
    // ดึงสถานะล่าสุดจาก backend (สถานะที่เก็บตอน login อาจเก่าแล้ว)
    apiData<Employee>("/api/employees/me")
      .then((fresh) => {
        const next = { ...emp, status: fresh.status, name: fresh.name, role: fresh.role };
        saveSession(getToken()!, next);
        setEmployee(next);
      })
      .catch(() => {
        /* backend รุ่นเก่ายังไม่มี /me — ใช้ค่าที่เก็บไว้ */
      });
  }, [router]);

  if (!employee) return null;

  const nav = [
    { href: "/staff", label: "ใบงาน", show: true },
    { href: "/staff/dashboard", label: "ภาพรวม", show: employee.role !== "TECHNICIAN" },
    { href: "/staff/admin", label: "จัดการระบบ", show: employee.role === "ADMIN" },
  ].filter((n) => n.show);
  const isActive = (href: string) => (href === "/staff" ? pathname === "/staff" || pathname.startsWith("/staff/repairs") : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
          <Coffee className="size-5 text-primary" />
          <span className="hidden font-semibold sm:inline">Homglai Service</span>
          <nav className="flex gap-1 text-sm sm:ml-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  isActive(n.href) ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <NotificationBell />
            <span className="hidden sm:inline">
              {employee.name} <span className="text-muted-foreground">· {ROLE_LABEL_TH[employee.role]}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              <LogOut />
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </header>
      {employee.role === "TECHNICIAN" && <TechnicianStatusBar employee={employee} onChange={setEmployee} />}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
