"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, LogOut } from "lucide-react";

import { clearSession, getEmployee, getToken } from "@/lib/auth";
import { ROLE_LABEL_TH, type Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";

// ทุกหน้าใต้ /staff ต้อง login ก่อน (backend ตรวจสิทธิ์ซ้ำทุก request อยู่แล้ว)
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const emp = getEmployee();
    if (!getToken() || !emp) {
      router.replace("/login");
      return;
    }
    setEmployee(emp);
  }, [router]);

  if (!employee) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Coffee className="size-5 text-primary" />
          <span className="font-semibold">Homglai Service</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
