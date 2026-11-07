// ชนิดข้อมูลจาก backend (ดูฉบับเต็มที่ docs/openapi.json)

export type RepairStatus =
  | "NEW"
  | "INSPECTING"
  | "WAITING_APPROVAL"
  | "REPAIRING"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

export type EmployeeRole = "ADMIN" | "TECHNICIAN" | "RECEPTIONIST";
export type EmployeeStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "RESERVED";

export const ROLE_LABEL_TH: Record<EmployeeRole, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  TECHNICIAN: "ช่าง",
  RECEPTIONIST: "พนักงานรับเครื่อง",
};

export interface Employee {
  id: string;
  username: string;
  name: string;
  role: EmployeeRole;
  status: EmployeeStatus;
}

export interface LoginResult {
  token: string;
  employee: Employee;
}

/** POST /api/tracking/search — ข้อมูลที่ลูกค้าเห็นได้ (whitelist) */
export interface PublicTrackingView {
  jobNumber: string;
  status: RepairStatus;
  statusLabelTh: string;
  receivedDate: string;
  updatedAt: string;
  machine: { brand: string; model: string };
  timeline: Array<{ status: RepairStatus; statusLabelTh: string; at: string }>;
}

/** ป้ายสถานะ (ข้อความเดียวกับที่ backend ใช้แสดงให้ลูกค้า) */
export const STATUS_LABEL_TH: Record<RepairStatus, string> = {
  NEW: "รับเรื่องแล้ว/รอคิวช่าง",
  INSPECTING: "กำลังตรวจเช็ค",
  WAITING_APPROVAL: "รอยืนยันราคา",
  REPAIRING: "กำลังซ่อม",
  COMPLETED: "ซ่อมเสร็จ",
  DELIVERED: "ส่งมอบแล้ว",
  CANCELLED: "ยกเลิก",
};

/** GET /api/repairs — รายการใบงาน (บางฟิลด์อาจถูกซ่อนตามบทบาท) */
export interface RepairOrderSummary {
  id: string;
  jobNumber: string;
  status: RepairStatus;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string } | null;
  machine?: { id: string; brand: string; model: string; serialNumber?: string | null } | null;
  technician?: { id: string; name: string } | null;
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  orders: T[];
}
