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
  id: number;
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
  id: number;
  jobNumber: string;
  status: RepairStatus;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: number; name: string; phone?: string } | null;
  machine?: { id: number; brand: string; model: string; serialNumber?: string | null } | null;
  technician?: { id: number; name: string } | null;
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  orders: T[];
}

// ---------------------------------------------------------------------------
// อาการเสีย (GET /api/symptoms)
// ---------------------------------------------------------------------------

export interface Symptom {
  id: number;
  name: string;
  categoryId: number;
}

export interface SymptomCategory {
  id: number;
  name: string;
  symptoms: Symptom[];
}

// ---------------------------------------------------------------------------
// ข้อมูลใบรับเครื่อง (POST /api/repairs)
// ---------------------------------------------------------------------------

export type WarrantyStatus = "IN_WARRANTY" | "OUT_OF_WARRANTY";
export type BillingType = "CHARGE_OUT_OF_WARRANTY" | "NO_CHARGE_IN_WARRANTY" | "CHARGE_IN_WARRANTY";

export const ACCESSORY_KEYS = [
  "drainTray",
  "portafilter",
  "basket1Shot",
  "basket2Shot",
  "powerCord",
  "waterTank",
  "tamper",
  "steamWandCover",
] as const;
export type AccessoryKey = (typeof ACCESSORY_KEYS)[number];
export type Accessories = Record<AccessoryKey, boolean> & { other: string | null };

export const ACCESSORY_LABEL_TH: Record<AccessoryKey, string> = {
  drainTray: "ถาดรองน้ำทิ้ง",
  portafilter: "ด้ามชง",
  basket1Shot: "ตะแกรง 1 ช็อต",
  basket2Shot: "ตะแกรง 2 ช็อต",
  powerCord: "สายไฟ",
  waterTank: "แท้งค์น้ำ",
  tamper: "แทมเปอร์",
  steamWandCover: "ปลอกก้านสตีม",
};

export type CareAdvice = { cleanAfterUse: boolean; noOverload: boolean };
export const CARE_ADVICE_LABEL_TH: Record<keyof CareAdvice, string> = {
  cleanAfterUse: "ทำความสะอาดเครื่องหลังใช้งาน",
  noOverload: "ไม่ใช้งานเครื่องเกินกำลัง",
};

export const WARRANTY_LABEL_TH: Record<WarrantyStatus, string> = {
  IN_WARRANTY: "อยู่ในประกัน",
  OUT_OF_WARRANTY: "หมดประกัน",
};

export const BILLING_LABEL_TH: Record<BillingType, string> = {
  CHARGE_OUT_OF_WARRANTY: "คิดค่าบริการ (นอกประกัน)",
  NO_CHARGE_IN_WARRANTY: "ไม่คิดค่าบริการ (ในประกัน)",
  CHARGE_IN_WARRANTY: "คิดค่าบริการ (ในประกัน)",
};

export interface CreateRepairInput {
  customer: { name: string; phone: string; address?: string | null };
  machine: { brand: string; model: string; serialNumber?: string | null };
  symptomIds: number[];
  otherSymptom?: string | null;
  paperBookNo?: string | null;
  paperReceiptNo?: string | null;
  receivedDate?: string;
  warrantyStatus?: WarrantyStatus | null;
  warrantyExpiryDate?: string | null;
  accessories?: Accessories | null;
  loanerMachine?: boolean;
  loanerNote?: string | null;
  billingType?: BillingType | null;
  careAdvice?: CareAdvice | null;
  warningNote?: string | null;
}

// ---------------------------------------------------------------------------
// รายละเอียดใบงาน (GET /api/repairs/{id})
// ---------------------------------------------------------------------------

export type ItemStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export type ItemType = "PART" | "TRAVEL_FEE" | "LABOR_HOURS" | "SERVICE_FEE";

export const ITEM_STATUS_LABEL_TH: Record<ItemStatus, string> = {
  PENDING: "รอลูกค้ายืนยัน",
  APPROVED: "ลูกค้าอนุมัติ",
  REJECTED: "ลูกค้าไม่อนุมัติ",
  COMPLETED: "ทำเสร็จแล้ว",
};

export const ITEM_TYPE_LABEL_TH: Record<ItemType, string> = {
  PART: "อะไหล่",
  TRAVEL_FEE: "ค่าเดินทาง",
  LABOR_HOURS: "ค่าแรง",
  SERVICE_FEE: "ค่าบริการ",
};

export interface RepairItem {
  id: number;
  barcode: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  itemType: ItemType;
  status: ItemStatus;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface StatusLogEntry {
  id: number;
  status: RepairStatus;
  note: string | null;
  createdAt: string;
  changedBy: { id: number; name: string; role: EmployeeRole } | null;
}

export type PaymentMethod = "CASH" | "TRANSFER" | "OTHER";
export const PAYMENT_METHOD_LABEL_TH: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

export interface RepairDetail {
  id: number;
  jobNumber: string;
  trackingToken?: string;
  status: RepairStatus;
  repairOutcome: "REPAIRED" | "NOT_REPAIRED" | null;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
  paperBookNo: string | null;
  paperReceiptNo: string | null;
  warrantyStatus: WarrantyStatus | null;
  warrantyExpiryDate: string | null;
  billingType: BillingType | null;
  loanerMachine: boolean;
  loanerNote: string | null;
  accessories: Partial<Accessories> | null;
  careAdvice: Partial<CareAdvice> | null;
  warningNote: string | null;
  otherSymptom: string | null;
  customer: { id: number; name: string; phone?: string; address?: string | null; lineLinked?: boolean } | null;
  machine: { id: number; brand: string; model: string; serialNumber: string | null } | null;
  technician: { id: number; name: string; status: EmployeeStatus } | null;
  helpers: Array<{ technician: { id: number; name: string } }>;
  symptoms: Array<{ symptom: { id: number; name: string; category?: { id: number; name: string } } }>;
  repairItems: RepairItem[];
  totalAmount: string;
  payment: {
    payableAmount: string;
    paidAmount: string | null;
    status: "NOT_RECORDED" | "MATCHED" | "DIFFERENT";
    warning: { code: string; message: string } | null;
    method: PaymentMethod | null;
    note: string | null;
    paidAt: string | null;
  };
  statusLogs: StatusLogEntry[];
  allowedActions: string[];
}

export type ImageKind = "INTAKE" | "RECEIPT_PAPER" | "DELIVERY" | "OTHER";
export const IMAGE_KIND_LABEL_TH: Record<ImageKind, string> = {
  INTAKE: "รูปตอนรับเครื่อง",
  RECEIPT_PAPER: "ใบรับเครื่อง",
  DELIVERY: "รูปตอนส่งมอบ",
  OTHER: "อื่น ๆ",
};

export interface RepairImage {
  id: number;
  kind: ImageKind;
  createdAt: string;
  uploadedBy: { id: number; name: string } | null;
}
