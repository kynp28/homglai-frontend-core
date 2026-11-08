"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { IMAGE_KIND_LABEL_TH, type ImageKind } from "@/lib/types";
import { selectClass } from "@/components/staff/form-bits";

/** อัปโหลดรูป (มือถือเปิดกล้องได้) — ช่างใช้ประเภท "รูปตอนส่งมอบ"/"อื่น ๆ" ส่วนรูปตอนรับเครื่องเป็นของพนักงานหน้าร้าน */
export function PhotoUpload({
  orderId,
  kinds = ["DELIVERY", "OTHER"],
  onDone,
}: {
  orderId: number;
  kinds?: ImageKind[];
  onDone: () => void;
}) {
  const [kind, setKind] = useState<ImageKind>(kinds[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("kind", kind);
      files.forEach((f) => form.append("files", f));
      await api(`/api/repairs/${orderId}/images`, { method: "POST", body: form });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1 && (
          <select aria-label="ประเภทรูป" className={`${selectClass} h-10 w-auto`} value={kind} onChange={(e) => setKind(e.target.value as ImageKind)}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {IMAGE_KIND_LABEL_TH[k]}
              </option>
            ))}
          </select>
        )}
        <label
          className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs hover:bg-accent ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          ถ่าย/เลือกรูป
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              upload(files);
            }}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
