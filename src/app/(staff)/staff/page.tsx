"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ApiError, apiData } from "@/lib/api";
import { STATUS_LABEL_TH, type Paginated, type RepairOrderSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// หน้าแรกของพนักงาน: รายการใบงานล่าสุด (โครงเริ่มต้น — จะแยกหน้าตามบทบาทในขั้นต่อไป)
export default function StaffHome() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<RepairOrderSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiData<Paginated<RepairOrderSummary>>("/api/repairs?page=1&limit=20")
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      });
  }, [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ใบงานซ่อม {data && <span className="text-sm font-normal text-muted-foreground">({data.total} รายการ)</span>}</CardTitle>
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
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{o.jobNumber}</td>
                    <td className="py-2 pr-4">{o.customer?.name ?? "—"}</td>
                    <td className="py-2 pr-4">{o.machine ? `${o.machine.brand} ${o.machine.model}` : "—"}</td>
                    <td className="py-2 pr-4">{o.technician?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{STATUS_LABEL_TH[o.status] ?? o.status}</Badge>
                    </td>
                    <td className="py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(o.receivedDate)}</td>
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
