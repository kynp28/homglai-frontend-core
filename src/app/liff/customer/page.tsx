"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, Coffee, Loader2, Plus, Search } from "lucide-react";

import { api } from "@/lib/api";
import { initLiff, type Liff } from "@/lib/liff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// LIFF ID ไม่ใช่ความลับ — ใช้ค่าจาก Vercel ถ้าตั้งไว้ ไม่งั้นใช้ LIFF ลูกค้าของร้าน
const LIFF_ID = process.env.NEXT_PUBLIC_LINE_CLIENT_LIFF_ID || "2012398844-KFMYfM1C";

interface Subscribed {
  jobNumber: string;
  statusLabelTh: string;
  alreadySubscribed: boolean;
}

/**
 * หน้า LIFF ลูกค้า (เมนู "รับแจ้งเตือนงานซ่อม" ใน LINE OA): กรอกเลขใบงาน + เบอร์โทรที่ให้ไว้กับร้าน
 * แล้วผูก LINE กับใบงานนั้น — เมื่อสถานะเปลี่ยน ร้านจะแจ้งทาง LINE (POST /api/tracking/subscribe-line)
 */
export default function LiffCustomerPage() {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [lineName, setLineName] = useState("");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Subscribed | null>(null);

  useEffect(() => {
    // เปิดจาก QR บนใบรับเครื่อง: ?q=REP-xxxx จะกรอกเลขใบงานให้
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
    initLiff(LIFF_ID)
      .then(async (l) => {
        setLiff(l);
        try {
          setLineName((await l.getProfile()).displayName);
        } catch {
          /* ไม่จำเป็น */
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "เปิดหน้านี้ไม่สำเร็จ กรุณาเปิดจากเมนูใน LINE"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!liff) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: Subscribed }>("/api/tracking/subscribe-line", {
        method: "POST",
        body: { query: query.trim(), phone: phone.trim(), lineAccessToken: liff.getAccessToken() },
        auth: false,
      });
      setDone(res.data);
    } catch (err) {
      setError(
        err instanceof Error && err.message && !err.message.startsWith("เกิดข้อผิดพลาด")
          ? err.message
          : "ผูกไม่สำเร็จ กรุณาตรวจสอบเลขใบงานและเบอร์โทรที่ให้ไว้กับร้านอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Coffee className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">รับแจ้งเตือนงานซ่อมทาง LINE</h1>
        <p className="text-sm text-muted-foreground">หอมไกล ชลบุรี — แจ้งทุกครั้งที่สถานะงานซ่อมของคุณเปลี่ยน</p>
      </div>

      <Card>
        {done ? (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                <CheckCircle2 className="size-5" />
                {done.alreadySubscribed ? "ผูกไว้แล้ว" : "ผูกสำเร็จ"}
              </CardTitle>
              <CardDescription>
                ใบงาน <strong className="text-foreground">{done.jobNumber}</strong> — สถานะตอนนี้:{" "}
                <strong className="text-foreground">{done.statusLabelTh}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
                <BellRing className="mt-0.5 size-4 shrink-0" />
                ร้านจะส่งข้อความแจ้งใน LINE นี้เมื่อสถานะเปลี่ยน เช่น เริ่มตรวจเช็ค รอยืนยันราคา ซ่อมเสร็จพร้อมรับเครื่อง
              </p>
              <Button asChild variant="outline">
                <Link href={`/track?q=${encodeURIComponent(done.jobNumber)}`}>
                  <Search /> ดูสถานะและไทม์ไลน์
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDone(null);
                  setQuery("");
                }}
              >
                <Plus /> ผูกใบงานอื่นเพิ่ม
              </Button>
              {liff?.isInClient() && (
                <Button variant="ghost" onClick={() => liff.closeWindow()}>
                  ปิดหน้านี้
                </Button>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-lg">กรอกข้อมูลใบงาน</CardTitle>
              <CardDescription>
                ดูเลขใบงานหรือเลขที่ได้จากใบรับเครื่อง และใช้เบอร์โทรเดียวกับที่ให้ไว้กับร้าน
                {lineName && (
                  <>
                    <br />
                    LINE ที่ใช้อยู่: <strong className="text-foreground">{lineName}</strong>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!liff && !error && <Loader2 className="animate-spin text-muted-foreground" />}
              {liff && (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="q">เลขใบงาน หรือ เลขที่ใบรับเครื่อง</Label>
                    <Input
                      id="q"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="REP-2611-0001 หรือ 5595"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">เบอร์โทรที่ให้ไว้กับร้าน</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812345678"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={busy || !query.trim() || !phone.trim()}>
                    {busy ? <Loader2 className="animate-spin" /> : <BellRing />} รับแจ้งเตือนใบงานนี้
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ร้านใช้เบอร์โทรเพื่อยืนยันว่าเป็นเจ้าของงานซ่อมเท่านั้น ข้อความแจ้งเตือนจะมีเฉพาะสถานะงาน
                  </p>
                </form>
              )}
            </CardContent>
          </>
        )}
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </main>
  );
}
