"use client";

import { useState } from "react";

/** เรียก API แล้วเก็บสถานะกำลังทำงาน/ข้อผิดพลาด สำหรับหน้า Admin */
export function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      onDone();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
