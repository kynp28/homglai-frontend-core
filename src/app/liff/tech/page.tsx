"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Link2, Loader2, LogIn, RefreshCw, Unlink, Wrench } from "lucide-react";

import { api, apiData } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import {
  ROLE_LABEL_TH,
  STATUS_LABEL_TH,
  type LoginResult,
  type Paginated,
  type RepairOrderSummary,
  type RepairStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicianStatusBar } from "@/components/staff/technician-status";
import { useTechSession } from "@/components/liff/use-tech-session";

const ACTIVE: RepairStatus[] = ["INSPECTING", "WAITING_APPROVAL", "REPAIRING"];
const jobHref = (id: number) => `/liff/tech/jobs/${id}`;

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-5">{children}</main>;
}

/** แอปช่างใน LINE: เข้าสู่ระบบด้วย LINE อัตโนมัติ → งานของฉัน · ถ้ายังไม่ผูก LINE จะพาไปผูกบัญชี */
export default function LiffTechHome() {
  const session = useTechSession();
  const { state, me, liff } = session;

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }
  if (state === "error") {
    return (
      <Shell>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{session.error}</p>
        <Button variant="outline" onClick={() => session.retry()}>
          <RefreshCw /> ลองใหม่
        </Button>
      </Shell>
    );
  }
  if (state === "not-linked" || !me) {
    return (
      <Shell>
        <LinkFlow
          liffToken={() => liff?.getAccessToken() ?? null}
          onLinked={async () => {
            await session.loadMe();
            session.setState("ready");
          }}
        />
      </Shell>
    );
  }
  return (
    <Shell>
      <Home me={me} onMeChange={(e) => session.setMe({ ...me, ...e })} onUnlinked={() => session.setState("not-linked")} />
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------
// ยังไม่ผูก LINE: login ด้วยชื่อผู้ใช้/รหัสผ่านครั้งเดียว แล้วผูก LINE นี้
// ---------------------------------------------------------------------------------------------

function LinkFlow({ liffToken, onLinked }: { liffToken: () => string | null; onLinked: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
      await api("/api/employees/me/line", { method: "POST", body: { lineAccessToken: liffToken() } });
      await onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ผูกบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ผูกบัญชี LINE ช่าง</CardTitle>
        <CardDescription>
          เข้าสู่ระบบด้วยบัญชีพนักงานครั้งเดียว ครั้งต่อไปเปิดจาก LINE ได้เลยไม่ต้องใส่รหัส และจะได้รับแจ้งงานใหม่ทาง LINE
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="u">ชื่อผู้ใช้</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="p">รหัสผ่าน</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <LogIn />} เข้าสู่ระบบและผูก LINE
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// งานของฉัน
// ---------------------------------------------------------------------------------------------

function JobRow({ o }: { o: RepairOrderSummary }) {
  return (
    <Link href={jobHref(o.id)} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 active:bg-accent">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{o.jobNumber}</p>
        <p className="truncate text-sm text-muted-foreground">
          {o.machine ? `${o.machine.brand} ${o.machine.model}` : "—"} · รับ {formatDate(o.receivedDate)}
        </p>
      </div>
      <Badge variant={o.status === "NEW" ? "default" : "secondary"}>{STATUS_LABEL_TH[o.status]}</Badge>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function Section({ title, items, empty }: { title: string; items: RepairOrderSummary[]; empty?: string }) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {title} {items.length > 0 && `(${items.length})`}
      </h2>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : items.map((o) => <JobRow key={o.id} o={o} />)}
    </section>
  );
}

function Home({
  me,
  onMeChange,
  onUnlinked,
}: {
  me: NonNullable<ReturnType<typeof useTechSession>["me"]>;
  onMeChange: (e: { status: typeof me.status }) => void;
  onUnlinked: () => void;
}) {
  const [orders, setOrders] = useState<RepairOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiData<Paginated<RepairOrderSummary>>("/api/repairs?page=1&limit=50")
      .then((d) => setOrders(d.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดงานไม่สำเร็จ"));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("hsc:refresh", load);
    return () => window.removeEventListener("hsc:refresh", load);
  }, [load]);

  const waiting = orders?.filter((o) => o.status === "NEW") ?? [];
  const active = orders?.filter((o) => ACTIVE.includes(o.status)) ?? [];
  const done = orders?.filter((o) => o.status === "COMPLETED").slice(0, 10) ?? [];

  return (
    <>
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wrench className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">งานของฉัน</p>
          <p className="text-xs text-muted-foreground">
            {me.name} · {ROLE_LABEL_TH[me.role]}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="โหลดใหม่" onClick={load}>
          <RefreshCw />
        </Button>
      </header>

      {me.role === "TECHNICIAN" && (
        <div className="-mx-4 overflow-hidden">
          <TechnicianStatusBar employee={me} onChange={(e) => onMeChange({ status: e.status })} jobHref={jobHref} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!orders && !error && <Loader2 className="animate-spin text-muted-foreground" />}
      {orders && (
        <>
          <Section title="รอกดรับงาน" items={waiting} />
          <Section title="กำลังทำ" items={active} empty="ยังไม่มีงานที่กำลังทำ" />
          <Section title="ซ่อมเสร็จ รอลูกค้ารับ" items={done} />
        </>
      )}

      <AccountBox onUnlinked={onUnlinked} />
    </>
  );
}

function AccountBox({ onUnlinked }: { onUnlinked: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/employees/me/line", { method: "DELETE", body: { reason: reason.trim() } });
      onUnlinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกการผูกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 border-t pt-4 text-sm">
      <p className="flex items-center gap-2 text-muted-foreground">
        <Link2 className="size-4" /> LINE นี้ผูกกับบัญชีพนักงานแล้ว
      </p>
      {!open ? (
        <button type="button" className="mt-2 flex items-center gap-1 text-xs text-muted-foreground underline" onClick={() => setOpen(true)}>
          <Unlink className="size-3" /> ยกเลิกการผูก LINE
        </button>
      ) : (
        <form onSubmit={unlink} className="mt-2 flex flex-col gap-2 rounded-md border p-3">
          <Label htmlFor="reason">เหตุผลที่ยกเลิกการผูก (แจ้งผู้ดูแลระบบ)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น เปลี่ยนมือถือ" rows={2} minLength={3} maxLength={300} required />
          {error && <p className="text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              ไม่ยกเลิก
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={busy || reason.trim().length < 3}>
              ยืนยันยกเลิกการผูก
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
