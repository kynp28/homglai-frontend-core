"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { ApiError, apiData } from "@/lib/api";
import { STATUS_LABEL_TH, type Paginated, type RepairOrderSummary } from "@/lib/types";
import { getEmployee } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// หน้าแรกของพนักงาน: รายการใบงานล่าสุด (โครงเริ่มต้น — จะแยกหน้าตามบทบาทในขั้นต่อไป)
export default function StaffHome() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<RepairOrderSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const role = getEmployee()?.role;
  const canCreate = role === "RECEPTIONIST" || role === "ADMIN";

  useEffect(() => {
    const load = () =>
      apiData<Paginated<RepairOrderSummary>>("/api/repairs?page=1&limit=20")
        .then(setData)
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) router.replace("/login");
          else setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
        });
    load();
    // โหลดใหม่เมื่อช่างเปลี่ยนสถานะ (อาจได้รับงานใหม่)
    window.addEventListener("hsc:refresh", load);
    return () => window.removeEventListener("hsc:refresh", load);
  }, [router]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>ใบงานซ่อม {data && <span className="text-sm font-normal text-muted-foreground">({data.total} รายการ)</span>}</CardTitle>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/staff/repairs/new">
              <Plus />
              เปิดใบงานใหม่
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <Loader2 className="animate-spin text-muted-foreground" />}
        {data && data.orders.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีใบงาน</p>}
        {data && data.orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">เลขที่ใบงาน</th>
                  <th className="py-2 pr-4 font-medium">ลูกค้า</th>
                  <th className="py-2 pr-4 font-medium">เครื่อง</th>
                  <th className="py-2 pr-4 font-medium">ช่าง</th>
                  <th className="py-2 pr-4 font-medium">สถานะ</th>
                  <th className="py-2 font-medium">รับเครื่อง</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-accent/50"
                    onClick={() => router.push(`/staff/repairs/${o.id}`)}
                  >
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      <Link href={`/staff/repairs/${o.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {o.jobNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{o.customer?.name ?? "—"}</td>
                    <td className="py-2 pr-4">{o.machine ? `${o.machine.brand} ${o.machine.model}` : "—"}</td>
                    <td className="py-2 pr-4">{o.technician?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{STATUS_LABEL_TH[o.status] ?? o.status}</Badge>
                    </td>
                    <td className="py-2 whitespace-nowrap text-muted-foreground">{formatDate(o.receivedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
