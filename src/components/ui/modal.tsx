"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** หน้าต่างป๊อปอัปแบบง่าย (ปิดด้วย Esc หรือคลิกพื้นหลัง) */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("w-full max-w-md rounded-t-xl bg-card p-5 shadow-lg sm:rounded-xl", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="ปิด">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
