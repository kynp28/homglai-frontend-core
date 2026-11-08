"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    if (!n.readAt) {
      await api(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
      load();
    }
    if (n.repairOrderId) {
      setOpen(false);
      router.push(`/staff/repairs/${n.repairOrderId}`);
    }
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
          <p className="border-b px-4 py-2 text-sm font-semibold">การแจ้งเตือน</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`w-full border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-accent ${n.readAt ? "text-muted-foreground" : ""}`}
                  >
                    <p className={n.readAt ? "" : "font-semibold"}>{n.title}</p>
                    <p className="mt-0.5 text-xs whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
