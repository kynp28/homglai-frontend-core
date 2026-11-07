"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { apiData } from "@/lib/api";
import type { RepairDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IntakeForm } from "@/components/staff/intake-form";

export default function EditRepairPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<RepairDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiData<RepairDetail>(`/api/repairs/${id}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ"));
  }, [id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!order) return <Loader2 className="animate-spin text-muted-foreground" />;
  if (!order.allowedActions.includes("EDIT_INTAKE")) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">ใบงานนี้แก้ไขข้อมูลรับเครื่องไม่ได้ (ปิดงานแล้ว หรือไม่มีสิทธิ์)</p>
        <Button asChild variant="outline">
          <Link href={`/staff/repairs/${id}`}>กลับ</Link>
        </Button>
      </div>
    );
  }
  return <IntakeForm initial={order} />;
}
