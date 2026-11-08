import type { Sheet } from "./xlsx";

/** GET /api/parts */
export interface Part {
  id: number;
  code: string;
  name: string;
  category: string | null;
  machineModels: string | null;
  unit: string;
  sellPrice: string | null;
  costPrice: string | null;
  stockQty: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartStockLog {
  id: number;
  change: number;
  qtyAfter: number;
  reason: "SCAN_IN" | "ADJUST" | "COUNT" | string;
  note: string | null;
  createdAt: string;
  employee: { id: number; name: string } | null;
}

export const STOCK_REASON_TH: Record<string, string> = {
  SCAN_IN: "ยิงบาร์โค้ดรับเข้า",
  ADJUST: "ปรับเพิ่ม/ลด",
  COUNT: "นับสต็อก",
};

export interface ImportRow {
  code: string;
  name: string;
  category?: string | null;
  machineModels?: string | null;
  unit?: string;
  sellPrice?: number | null;
  costPrice?: number | null;
  stockQty?: number;
  note?: string | null;
}

type Field = keyof ImportRow;

/** หัวคอลัมน์ที่รู้จัก (เทียบแบบไม่สนตัวพิมพ์/ช่องว่าง) — เรียงตามลำดับความสำคัญ */
const ALIASES: Array<[Field, string[]]> = [
  ["code", ["รหัส", "รหัสสินค้า", "รหัสอะไหล่", "บาร์โค้ด", "barcode", "code", "sku", "partno", "model"]],
  ["name", ["ชื่อ", "ชื่ออะไหล่", "ชื่อสินค้า", "รายการ", "name", "description"]],
  ["sellPrice", ["ราคาขาย", "ราคา", "ราคาขาย(บาท)", "sellprice", "price"]],
  ["costPrice", ["ราคาทุน", "ทุน", "costprice", "cost"]],
  ["category", ["หมวด", "หมวดหมู่", "ประเภท", "category"]],
  ["machineModels", ["รุ่นเครื่อง", "ใช้กับรุ่น", "ใช้กับเครื่อง", "machinemodels", "machine"]],
  ["unit", ["หน่วย", "unit", "uom"]],
  // "QTY" ในใบเสนอราคาคือจำนวนสั่งซื้อ ไม่ใช่สต็อก จึงรับเฉพาะหัวที่หมายถึงคงเหลือ
  ["stockQty", ["คงเหลือ", "จำนวนคงเหลือ", "สต็อก", "stock", "onhand"]],
  ["note", ["หมายเหตุ", "note", "remark"]],
];

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[().]/g, "");

/** ราคาที่เป็นเงินหยวน/สกุลอื่น ห้ามเอาไปเป็นราคาบาท */
const isForeignCurrency = (header: string) => /cny|rmb|usd|หยวน|ดอลลาร์/.test(header);

export interface ParsedSheet {
  sheet: string;
  rows: ImportRow[];
  columns: Partial<Record<Field, string>>;
  warnings: string[];
}

/** หาแถวหัวตาราง (แถวแรกที่มีคอลัมน์รหัสและชื่อ) แล้วแปลงเป็นแถวนำเข้า */
export function parseSheet(sheet: Sheet): ParsedSheet | null {
  for (let h = 0; h < Math.min(sheet.rows.length, 30); h++) {
    const header = sheet.rows[h].map(norm);
    const columns = new Map<Field, number>();
    const warnings: string[] = [];
    for (const [field, aliases] of ALIASES) {
      for (const alias of aliases) {
        const idx = header.findIndex((cell, i) => cell === norm(alias) && ![...columns.values()].includes(i));
        if (idx >= 0) {
          columns.set(field, idx);
          break;
        }
      }
    }
    // ราคาเป็นหยวน → ไม่ใช้เป็นราคาขาย แต่เก็บไว้ในหมายเหตุ
    const foreignIdx = header.findIndex((c) => c.includes("price") && isForeignCurrency(c));
    if (!columns.has("code") || !columns.has("name")) continue;
    const priceIdx = columns.get("sellPrice");
    if (priceIdx !== undefined && isForeignCurrency(header[priceIdx])) columns.delete("sellPrice");
    if (foreignIdx >= 0) warnings.push(`คอลัมน์ "${sheet.rows[h][foreignIdx]}" เป็นราคาสกุลเงินต่างประเทศ — เก็บไว้ในหมายเหตุ ไม่ใช้เป็นราคาขาย`);

    const cell = (row: Array<string | number | null>, f: Field) => {
      const i = columns.get(f);
      return i === undefined ? null : row[i];
    };
    const text = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim());
    const num = (v: unknown) => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    };

    const rows: ImportRow[] = [];
    for (const row of sheet.rows.slice(h + 1)) {
      const code = text(cell(row, "code"));
      const name = text(cell(row, "name"));
      if (!code || !name || !/^[A-Za-z0-9._\/-]{1,64}$/.test(code)) continue;
      const foreign = foreignIdx >= 0 ? num(row[foreignIdx]) : null;
      const noteParts = [text(cell(row, "note")), foreign !== null ? `ราคาผู้ผลิต ${foreign} ${/cny|rmb|หยวน/.test(header[foreignIdx]) ? "CNY" : ""}`.trim() : null].filter(Boolean);
      const qty = num(cell(row, "stockQty"));
      rows.push({
        code,
        name: name.slice(0, 191),
        category: text(cell(row, "category")) ?? sheet.name,
        machineModels: text(cell(row, "machineModels")) ?? sheet.name,
        ...(text(cell(row, "unit")) ? { unit: (/^pcs?$/i.test(text(cell(row, "unit"))!) ? "ชิ้น" : text(cell(row, "unit"))!).slice(0, 20) } : {}),
        ...(columns.has("sellPrice") ? { sellPrice: num(cell(row, "sellPrice")) } : {}),
        ...(columns.has("costPrice") ? { costPrice: num(cell(row, "costPrice")) } : {}),
        ...(qty !== null && qty >= 0 ? { stockQty: Math.floor(qty) } : {}),
        note: noteParts.length ? noteParts.join(" · ").slice(0, 500) : null,
      });
    }
    const named: Partial<Record<Field, string>> = {};
    columns.forEach((i, f) => (named[f] = String(sheet.rows[h][i] ?? "")));
    return { sheet: sheet.name, rows, columns: named, warnings };
  }
  return null;
}

/** CSV (UTF-8 + BOM ให้ Excel อ่านภาษาไทยถูก) */
export function partsToCsv(parts: Part[]): string {
  const head = ["รหัส", "ชื่ออะไหล่", "หมวด", "รุ่นเครื่อง", "หน่วย", "ราคาขาย", "ราคาทุน", "คงเหลือ", "หมายเหตุ"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = parts.map((p) =>
    [p.code, p.name, p.category, p.machineModels, p.unit, p.sellPrice, p.costPrice, p.stockQty, p.note].map(esc).join(","),
  );
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

/** รวมแถวรหัสเดียวกันจากหลายแผ่น (เช่นอะไหล่ที่ใช้ได้หลายรุ่น): รวมรุ่นเครื่อง ใช้ข้อมูลแถวแรก */
export function mergeRows(sheets: ParsedSheet[]): { rows: ImportRow[]; conflicts: string[] } {
  const byCode = new Map<string, ImportRow>();
  const conflicts: string[] = [];
  for (const s of sheets) {
    for (const r of s.rows) {
      const prev = byCode.get(r.code);
      if (!prev) {
        byCode.set(r.code, { ...r });
        continue;
      }
      if (prev.name.trim().toLowerCase() !== r.name.trim().toLowerCase()) {
        conflicts.push(`${r.code}: "${prev.name}" กับ "${r.name}" (ใช้ชื่อแรก)`);
      }
      const models = new Set(
        [prev.machineModels, r.machineModels]
          .filter(Boolean)
          .flatMap((m) => String(m).split(/\s*,\s*/)),
      );
      prev.machineModels = [...models].join(", ").slice(0, 500) || null;
    }
  }
  return { rows: [...byCode.values()], conflicts };
}
