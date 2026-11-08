"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, apiData } from "@/lib/api";
import { clearSession, getToken, saveSession } from "@/lib/auth";
import { initLiff, type Liff } from "@/lib/liff";
import type { Employee, LoginResult } from "@/lib/types";

// LIFF ID ไม่ใช่ความลับ — ใช้ค่าจาก Vercel ถ้าตั้งไว้ ไม่งั้นใช้ LIFF ช่างของร้าน
export const TECH_LIFF_ID = process.env.NEXT_PUBLIC_LINE_TECH_LIFF_ID || "2012415444-0KcVoFEn";

export type Me = Employee & { lineLinked: boolean };
export type TechSessionState = "loading" | "ready" | "not-linked" | "error";

/**
 * เปิดแอปช่างใน LINE: init LIFF แล้วเข้าสู่ระบบให้อัตโนมัติด้วย LINE (POST /api/auth/line)
 * ถ้า LINE นี้ยังไม่ผูกกับบัญชีพนักงาน → state "not-linked" (หน้าแรกจะพาไปผูก)
 */
export function useTechSession() {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<TechSessionState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const data = await apiData<Me>("/api/employees/me");
    setMe(data);
    return data;
  }, []);

  const signIn = useCallback(
    async (l: Liff) => {
      // 1) token เดิมยังใช้ได้และเป็นของ LINE ที่ผูกไว้
      if (getToken()) {
        try {
          const current = await loadMe();
          if (current.lineLinked) {
            setState("ready");
            return;
          }
        } catch {
          clearSession();
        }
      }
      // 2) เข้าสู่ระบบด้วย LINE
      try {
        const { token, employee } = await apiData<LoginResult>("/api/auth/line", {
          method: "POST",
          body: { lineAccessToken: l.getAccessToken() },
          auth: false,
        });
        saveSession(token, employee);
        await loadMe();
        setState("ready");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setState("not-linked");
        } else {
          setError(err instanceof Error ? err.message : "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
          setState("error");
        }
      }
    },
    [loadMe],
  );

  useEffect(() => {
    initLiff(TECH_LIFF_ID)
      .then((l) => {
        setLiff(l);
        return signIn(l);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "เปิดแอปไม่สำเร็จ กรุณาเปิดจากเมนูใน LINE");
        setState("error");
      });
  }, [signIn]);

  return { liff, me, setMe, state, setState, error, loadMe, retry: () => liff && signIn(liff) };
}
