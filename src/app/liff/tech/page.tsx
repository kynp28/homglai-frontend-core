"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, Loader2, LogIn, Unlink } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { clearSession, getToken, saveSession } from "@/lib/auth";
import { initLiff, type Liff } from "@/lib/liff";
import { ROLE_LABEL_TH, type Employee, type LoginResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// LIFF ID ไม่ใช่ความลับ — ใช้ค่าจาก Vercel ถ้าตั้งไว้ ไม่งั้นใช้ LIFF ช่างของร้าน
const LIFF_ID = process.env.NEXT_PUBLIC_LINE_TECH_LIFF_ID || "2012415444-0KcVoFEn";

type Me = Employee & { lineLinked: boolean };

/**
 * หน้า LIFF ของช่าง (เปิดจากเมนูใน LINE OA ช่าง): login ด้วยบัญชีพนักงาน แล้วผูก LINE นี้กับบัญชี
 * เพื่อรับแจ้งเตือนงานใหม่และกด "รับงานนี้" ใน LINE ได้
 */
export default function LiffTechPage() {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [lineName, setLineName] = useState<string>("");
  const [me, setMe] = useState<Me | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [unlinking, setUnlinking] = useState(false);
  const [reason, setReason] = useState("");
  const [pushWarning, setPushWarning] = useState(false);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setNeedLogin(true);
      return;
    }
    try {
      setMe(await apiData<Me>("/api/employees/me"));
      setNeedLogin(false);
    } catch {
      clearSession();
      setNeedLogin(true);
    }
  }, []);

  useEffect(() => {
    initLiff(LIFF_ID)
      .then(async (l) => {
        setLiff(l);
        try {
          setLineName((await l.getProfile()).displayName);
        } catch {
          /* ชื่อ LINE ไม่จำเป็น */
        }
        await loadMe();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "เปิด LIFF ไม่สำเร็จ"));
  }, [loadMe]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, employee } = await apiData<LoginResult>("/api/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });
      saveSession(token, employee);
      setPassword("");
      await loadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function link() {
    if (!liff) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data?: { confirmationSent?: boolean } }>("/api/employees/me/line", {
        method: "POST",
        body: { lineAccessToken: liff.getAccessToken() },
      });
      setPushWarning(res.data?.confirmationSent === false);
      await loadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ผูกบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/employees/me/line", { method: "DELETE", body: { reason: reason.trim() } });
      setUnlinking(false);
      setReason("");
      await loadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกการผูกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ผูกบัญชี LINE ช่าง</CardTitle>
          <CardDescription>
            ผูกครั้งเดียว แล้วจะได้รับแจ้งงานซ่อมใหม่ทาง LINE และกด &quot;รับงานนี้&quot; ได้ทันที
            {lineName && (
              <>
                <br />
                LINE ที่ใช้อยู่: <strong className="text-foreground">{lineName}</strong>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!liff && !error && <Loader2 className="animate-spin text-muted-foreground" />}

          {liff && needLogin && (
            <form onSubmit={login} className="flex flex-col gap-3">
              <p className="text-sm">เข้าสู่ระบบด้วยบัญชีพนักงานของคุณ</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="u">ชื่อผู้ใช้</Label>
                <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p">รหัสผ่าน</Label>
                <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <LogIn />} เข้าสู่ระบบ
              </Button>
            </form>
          )}

          {liff && me && (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                บัญชีพนักงาน: <strong>{me.name}</strong> · {ROLE_LABEL_TH[me.role]}
              </p>
              {me.lineLinked ? (
                <>
                  <p className="flex items-center gap-2 rounded-md bg-green-600/10 px-3 py-2 text-sm text-green-800">
                    <CheckCircle2 className="size-4" /> ผูก LINE แล้ว — งานใหม่จะส่งมาที่แชตนี้
                  </p>
                  {pushWarning && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                      ผูกสำเร็จ แต่ระบบส่งข้อความเข้า LINE นี้ไม่ได้ — กรุณาเพิ่มเพื่อน OA ช่างก่อน (ถ้าเคยบล็อกไว้ให้ปลดบล็อก)
                    </p>
                  )}
                  <Button asChild>
                    <Link href="/staff">ไปหน้างานของฉัน</Link>
                  </Button>
                  {!unlinking ? (
                    <Button variant="ghost" onClick={() => setUnlinking(true)} disabled={busy}>
                      <Unlink /> ยกเลิกการผูก LINE
                    </Button>
                  ) : (
                    <form
                      className="flex flex-col gap-2 rounded-md border p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        unlink();
                      }}
                    >
                      <Label htmlFor="reason">เหตุผลที่ยกเลิกการผูก (แจ้งผู้ดูแลระบบ)</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="เช่น เปลี่ยนมือถือ / เปลี่ยนบัญชี LINE"
                        minLength={3}
                        maxLength={300}
                        rows={2}
                        required
                      />
                      <p className="text-xs text-muted-foreground">หลังยกเลิก จะไม่ได้รับแจ้งงานใหม่ทาง LINE จนกว่าจะผูกใหม่</p>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setUnlinking(false)} disabled={busy}>
                          ไม่ยกเลิก
                        </Button>
                        <Button type="submit" variant="destructive" disabled={busy || reason.trim().length < 3}>
                          {busy && <Loader2 className="animate-spin" />}
                          ยืนยันยกเลิกการผูก
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <Button onClick={link} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Link2 />} ผูก LINE นี้กับบัญชี {me.name}
                </Button>
              )}
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => {
                  clearSession();
                  setMe(null);
                  setNeedLogin(true);
                }}
              >
                ไม่ใช่บัญชีของคุณ? ออกจากระบบ
              </button>
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
