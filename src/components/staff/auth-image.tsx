"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** รูปจาก backend ต้องแนบ token จึงโหลดเป็น blob แทนการใส่ URL ตรง ๆ ใน <img> */
export function AuthImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(res.status)))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-md border bg-muted", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : failed ? (
        <ImageOff className="size-5 text-muted-foreground" />
      ) : (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
