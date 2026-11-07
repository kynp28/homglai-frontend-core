"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { api, apiData } from "@/lib/api";
import type { SymptomCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { selectClass } from "@/components/staff/form-bits";
import { useAction } from "./use-action";

/** ช่องแก้ชื่อแบบในบรรทัด */
function InlineName({ value, onSave, busy }: { value: string; onSave: (name: string) => void; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(value);
  if (!editing) {
    return (
      <span className="flex items-center gap-1">
        {value}
        <Button size="icon" variant="ghost" className="size-7" onClick={() => (setName(value), setEditing(true))} aria-label="แก้ชื่อ">
          <Pencil className="size-3.5" />
        </Button>
      </span>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && name.trim() !== value) onSave(name.trim());
        setEditing(false);
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-56" maxLength={100} autoFocus />
      <Button type="submit" size="icon" variant="ghost" className="size-7" disabled={busy} aria-label="บันทึก">
        <Check className="size-3.5" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => setEditing(false)} aria-label="ยกเลิก">
        <X className="size-3.5" />
      </Button>
    </form>
  );
}

export function SymptomsTab() {
  const [cats, setCats] = useState<SymptomCategory[] | null>(null);
  const load = useCallback(() => {
    apiData<SymptomCategory[]>("/api/symptoms").then(setCats).catch(() => setCats([]));
  }, []);
  useEffect(load, [load]);
  const { busy, error, run } = useAction(load);
  const [newCat, setNewCat] = useState("");
  const [newSymptom, setNewSymptom] = useState<Record<number, string>>({});

  if (!cats) return <Loader2 className="animate-spin text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        อาการที่ใช้กับใบงานแล้วลบไม่ได้ (เปลี่ยนชื่อแทน) · หมวดที่ยังมีอาการอยู่ลบไม่ได้
      </p>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newCat.trim()) run(() => api("/api/symptoms/categories", { method: "POST", body: { name: newCat.trim() } }), () => setNewCat(""));
        }}
      >
        <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="ชื่อหมวดใหม่ เช่น ระบบไฟฟ้า" maxLength={100} />
        <Button type="submit" disabled={busy || !newCat.trim()}>
          <Plus /> เพิ่มหมวด
        </Button>
      </form>

      {cats.map((cat) => (
        <Card key={cat.id} className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="font-semibold">
              <InlineName
                value={cat.name}
                busy={busy}
                onSave={(name) => run(() => api(`/api/symptoms/categories/${cat.id}`, { method: "PATCH", body: { name } }))}
              />
            </div>
            {cat.symptoms.length === 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => run(() => api(`/api/symptoms/categories/${cat.id}`, { method: "DELETE" }))}
              >
                <Trash2 /> ลบหมวด
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {cat.symptoms.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                <InlineName value={s.name} busy={busy} onSave={(name) => run(() => api(`/api/symptoms/${s.id}`, { method: "PATCH", body: { name } }))} />
                <div className="flex items-center gap-1">
                  <select
                    aria-label="ย้ายหมวด"
                    className={`${selectClass} h-8 w-40`}
                    value={cat.id}
                    disabled={busy}
                    onChange={(e) => run(() => api(`/api/symptoms/${s.id}`, { method: "PATCH", body: { categoryId: Number(e.target.value) } }))}
                  >
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    disabled={busy}
                    onClick={() => run(() => api(`/api/symptoms/${s.id}`, { method: "DELETE" }))}
                    aria-label="ลบอาการ"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = (newSymptom[cat.id] ?? "").trim();
                if (name)
                  run(
                    () => api("/api/symptoms", { method: "POST", body: { name, categoryId: cat.id } }),
                    () => setNewSymptom((m) => ({ ...m, [cat.id]: "" })),
                  );
              }}
            >
              <Input
                value={newSymptom[cat.id] ?? ""}
                onChange={(e) => setNewSymptom((m) => ({ ...m, [cat.id]: e.target.value }))}
                placeholder="เพิ่มอาการในหมวดนี้"
                className="h-9"
                maxLength={100}
              />
              <Button type="submit" size="sm" variant="outline" disabled={busy || !(newSymptom[cat.id] ?? "").trim()}>
                <Plus /> เพิ่ม
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
