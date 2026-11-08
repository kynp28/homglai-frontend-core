/**
 * Minimal .xlsx reader for the browser (no dependencies): unzips with DecompressionStream and reads cell
 * values (shared strings, inline strings, numbers) of every sheet. Formulas give their cached value.
 * Good for plain data sheets; formatting, merged cells and dates are not interpreted.
 */

export interface Sheet {
  name: string;
  rows: Array<Array<string | number | null>>;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads the zip central directory and returns name -> file bytes (stored or deflated entries). */
async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ไฟล์นี้ไม่ใช่ .xlsx");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(start, start + compSize);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflateRaw(raw));
  }
  return files;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

/** Text of every <t> inside a fragment (rich text runs are joined). */
const textOf = (xml: string) => Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) => decodeXml(m[1])).join("");

function colIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  return letters.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

export async function readXlsx(file: ArrayBuffer): Promise<Sheet[]> {
  const files = await unzip(file);
  const text = (name: string) => (files.has(name) ? new TextDecoder().decode(files.get(name)) : "");

  const shared = Array.from(text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g), (m) => textOf(m[1]));

  // Sheet names in workbook order -> their files (via relationships)
  const rels = new Map(
    Array.from(text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g), (m) => {
      const id = /Id="([^"]+)"/.exec(m[0])?.[1] ?? "";
      const target = /Target="([^"]+)"/.exec(m[0])?.[1] ?? "";
      return [id, target.startsWith("/") ? target.slice(1) : `xl/${target}`] as const;
    }),
  );
  const sheets = Array.from(text("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g), (m) => ({
    name: decodeXml(/name="([^"]*)"/.exec(m[0])?.[1] ?? ""),
    path: rels.get(/r:id="([^"]+)"/.exec(m[0])?.[1] ?? "") ?? "",
  }));

  return sheets.map(({ name, path }) => {
    const rows: Sheet["rows"] = [];
    for (const rowMatch of text(path).matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowIndex = Number(/r="(\d+)"/.exec(rowMatch[1])?.[1] ?? rows.length + 1) - 1;
      const row: Array<string | number | null> = [];
      for (const c of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const body = c[2] ?? "";
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const idx = ref ? colIndex(ref) : row.length;
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value: string | number | null = null;
        if (type === "s" && v !== undefined) value = shared[Number(v)] ?? null;
        else if (type === "inlineStr") value = textOf(body);
        else if (type === "str" || type === "e") value = v !== undefined ? decodeXml(v) : null;
        else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined) value = Number.isFinite(Number(v)) ? Number(v) : decodeXml(v);
        row[idx] = value;
      }
      rows[rowIndex] = Array.from(row, (x) => (x === undefined ? null : x));
    }
    return { name, rows: Array.from(rows, (r) => r ?? []) };
  });
}
