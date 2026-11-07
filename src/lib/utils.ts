import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

// ฟิลด์ที่เป็น "วันที่อย่างเดียว" (เช่น receivedDate) backend ส่งมาเป็นเที่ยงคืน UTC จึงแสดงด้วย UTC
const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" });

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFormatter.format(new Date(iso)) : "—";
}

/** วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

const moneyFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return moneyFormatter.format(Number(value));
}
