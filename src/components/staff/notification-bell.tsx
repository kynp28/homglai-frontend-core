"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Clock, ExternalLink, Hand, RotateCcw, Unlink, Wrench } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/** ไอคอนและสีตามประเภทการแจ้งเตือน */
const KIND: Record<string, { icon: React.ReactNode; tone: string; label: string }> = {
  LINE_UNLINKED: { icon: <Unlink className="size-5" />, tone: "bg-amber-100 text-amber-800", label: "ยกเลิกการผูก LINE" },
  ACK_OVERDUE_DIGEST: { icon: <Clock className="size-5" />, tone: "bg-red-100 text-red-700", label: "ช่างยังไม่กดรับงาน" },
  PROGRESS_UNANSWERED_DIGEST: { icon: <Clock className="size-5" />, tone: "bg-red-100 text-red-700", label: "ช่างไม่ตอบความคืบหน้า" },
  PROGRESS_CHECK: { icon: <Wrench className="size-5" />, tone: "bg-blue-100 text-blue-700", label: "เช็กความคืบหน้า" },
  JOB_RESERVED: { icon: <Hand className="size-5" />, tone: "bg-green-100 text-green-800", label: "งานใหม่" },
  JOB_ACK_REMINDER: { icon: <Hand className="size-5" />, tone: "bg-amber-100 text-amber-800", label: "เตือนให้กดรับงาน" },
  ORDERS_REQUEUED_DIGEST: { icon: <RotateCcw className="size-5" />, tone: "bg-purple-100 text-purple-800", label: "งานกลับเข้าคิว" },
};
const kindOf = (type: string) => KIND[type] ?? { icon: <Bell className="size-5" />, tone: "bg-secondary text-foreground", label: "แจ้งเตือน" };

/** แยกเนื้อความ: บรรทัด "- …" เป็นรายการ, "เหตุผล: …" เป็นกล่องอ้างอิง, ที่เหลือเป็นย่อหน้า */
function NotificationBody({ body }: { body: string }) {
  const lines = body.split("\n").filter((l) => l.trim());
  const bullets = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
  const reason = lines.find((l) => l.startsWith("เหตุผล:"));
  const text = lines.filter((l) => !l.startsWith("- ") && l !== reason);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {text.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
      {reason && (
        <blockquote className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-amber-900">
          <span className="text-xs font-medium">เหตุผลที่แจ้งไว้</span>
          <p className="mt-0.5">{reason.replace(/^เหตุผล:\s*/, "")}</p>
        </blockquote>
      )}
      {bullets.length > 0 && (
        <ul className="flex flex-col divide-y rounded-md border">
          {bullets.map((b, i) => (
            <li key={i} className="px-3 py-2">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface StaffNotification {
  id: number;
  type: string;
  repairOrderId: number | null;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

const POLL_MS = 60_000;

/** กระดิ่งแจ้งเตือนในเว็บพนักงาน (GET /api/notifications) — โหลดใหม่ทุก 1 นาที */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<StaffNotification | null>(null);

  const load = useCallback(() => {
    apiData<{ unreadCount: number; notifications: StaffNotification[] }>("/api/notifications?page=1&limit=20")
      .then((d) => {
        setItems(d.notifications);
        setUnread(d.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openItem(n: StaffNotification) {
    setOpen(false);
    setSelected(n);
    if (!n.readAt) {
      await api(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
      load();
    }
  }

  async function markAllRead() {
    const unreadItems = items.filter((n) => !n.readAt);
    await Promise.all(unreadItems.map((n) => api(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {})));
    load();
  }

  return (
    <div className="relative" ref={boxRef}>
      <Button variant="ghost" size="icon" aria-label={`การแจ้งเตือน ${unread} รายการที่ยังไม่อ่าน`} onClick={() => setOpen((o) => !o)}>
        <Bell />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card shadow-lg">
          <div className="sticky top-0 flex items-center justify-between border-b bg-card px-4 py-2">
            <p className="text-sm font-semibold">การแจ้งเตือน</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <CheckCheck className="size-3.5" /> อ่านทั้งหมด
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-accent ${n.readAt ? "text-muted-foreground" : ""}`}
                  >
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${kindOf(n.type).tone} ${n.readAt ? "opacity-60" : ""}`}>
                      {kindOf(n.type).icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className={`flex-1 ${n.readAt ? "" : "font-semibold"}`}>{n.title}</span>
                        {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="ยังไม่อ่าน" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs">{n.body.replace(/\n/g, " ")}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? kindOf(selected.type).label : ""} className="max-w-lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${kindOf(selected.type).tone}`}>
                {kindOf(selected.type).icon}
              </span>
              <div>
                <p className="text-base font-semibold">{selected.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>
            <NotificationBody body={selected.body} />
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setSelected(null)}>
                ปิด
              </Button>
              {selected.repairOrderId && (
                <Button
                  onClick={() => {
                    const id = selected.repairOrderId;
                    setSelected(null);
                    router.push(`/staff/repairs/${id}`);
                  }}
                >
                  <ExternalLink /> เปิดใบงาน
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
