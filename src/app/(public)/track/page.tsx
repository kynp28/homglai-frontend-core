"use client";

import { useState } from "react";
import { Search, Coffee, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import type { PublicTrackingView } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TrackPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicTrackingView | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<{ data: PublicTrackingView }>("/api/tracking/search", {
        method: "POST",
        body: { query: q },
        auth: false,
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Coffee className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold">ติดตามสถานะงานซ่อม</h1>
        <p className="text-sm text-muted-foreground">กรอกเลขที่ใบงาน (เช่น REP-2611-0001) หรือเลขที่ใบรับเครื่อง</p>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เลขที่ใบงาน / ใบรับเครื่อง"
          aria-label="เลขที่ใบงาน"
          autoComplete="off"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          ค้นหา
        </Button>
      </form>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {result && (
        <Card>
          <CardHeader>
            <CardDescription>{result.jobNumber}</CardDescription>
            <CardTitle className="text-xl">{result.statusLabelTh}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {result.machine.brand} {result.machine.model}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">รับเครื่อง: </span>
                {formatDate(result.receivedDate)}
              </span>
              <span>
                <span className="text-muted-foreground">อัปเดตล่าสุด: </span>
                {formatDateTime(result.updatedAt)}
              </span>
            </div>
            <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
              {[...result.timeline].reverse().map((t, i) => (
                <li key={`${t.status}-${t.at}`} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`}
                  />
                  <div className="flex items-center gap-2">
                    {i === 0 ? <Badge>{t.statusLabelTh}</Badge> : <span className="text-sm">{t.statusLabelTh}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.at)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
