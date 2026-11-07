import type { Employee } from "./types";

// เก็บ token ไว้ใน localStorage (JWT อายุ 12 ชม.) — พอสำหรับเดโม
const TOKEN_KEY = "hsc.token";
const EMPLOYEE_KEY = "hsc.employee";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getEmployee(): Employee | null {
  const raw = storage()?.getItem(EMPLOYEE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Employee;
  } catch {
    return null;
  }
}

export function saveSession(token: string, employee: Employee) {
  const s = storage();
  s?.setItem(TOKEN_KEY, token);
  s?.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
}

export function clearSession() {
  const s = storage();
  s?.removeItem(TOKEN_KEY);
  s?.removeItem(EMPLOYEE_KEY);
}
