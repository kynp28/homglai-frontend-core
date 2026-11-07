import { getToken, clearSession } from "./auth";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** แนบ JWT ของพนักงาน (ค่าเริ่มต้น true) */
  auth?: boolean;
};

/**
 * เรียก backend แล้วคืนค่า JSON ทั้งก้อน
 * backend ตอบรูปแบบ { status: "success", data } หรือ { status: "error", message }
 */
export async function api<T = unknown>(path: string, { body, auth = true, headers, ...init }: Options = {}): Promise<T> {
  const h = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) h.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: h,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) clearSession();
    throw new ApiError(res.status, errorMessage(json, res.status), json);
  }
  return json as T;
}

/** รวมข้อความ error จาก backend (รวมรายการ field จาก validation ถ้ามี) */
function errorMessage(json: unknown, status: number): string {
  if (!json || typeof json !== "object") return `เกิดข้อผิดพลาด (${status})`;
  const body = json as { message?: unknown; error?: unknown; errors?: Array<{ field?: string; message?: string }> };
  const base = String(body.message ?? body.error ?? `เกิดข้อผิดพลาด (${status})`);
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return `${base}: ${body.errors.map((e) => (e.field ? `${e.field} — ${e.message}` : e.message)).join(", ")}`;
  }
  return base;
}


/** สำหรับ endpoint ที่ตอบ { status, data } */
export async function apiData<T>(path: string, options?: Options): Promise<T> {
  const json = await api<{ data: T }>(path, options);
  return json.data;
}
