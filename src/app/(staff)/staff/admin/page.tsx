"use client";

import { useState } from "react";

import { getEmployee } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { EmployeesTab } from "@/components/admin/employees-tab";
import { SymptomsTab } from "@/components/admin/symptoms-tab";
import { HolidaysTab } from "@/components/admin/holidays-tab";

const TABS = [
  { key: "employees", label: "พนักงาน" },
  { key: "symptoms", label: "อาการเสีย" },
  { key: "holidays", label: "วันหยุดร้าน" },
] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("employees");
  if (getEmployee()?.role !== "ADMIN") return <p className="text-sm text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">จัดการระบบ</h1>
      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "employees" && <EmployeesTab />}
      {tab === "symptoms" && <SymptomsTab />}
      {tab === "holidays" && <HolidaysTab />}
    </div>
  );
}
