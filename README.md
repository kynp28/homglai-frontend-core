# homglai-service-core-frontend

หน้าเว็บของระบบติดตามงานซ่อมเครื่องชงกาแฟ (Homglai Service Core)
Backend อยู่อีก repo (`homglai-service-core`) deploy บน Railway — frontend นี้ deploy บน Vercel

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · npm

## เริ่มใช้งานบนเครื่อง

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

ไฟล์ `.env.local` กำหนด URL ของ backend:

```
NEXT_PUBLIC_API_URL=https://homglai-service-core-production.up.railway.app
```

> backend ต้องอนุญาตโดเมนนี้ใน `CORS_ORIGINS` (ตั้งใน Railway → Variables) เช่น
> `http://localhost:3000,https://<โปรเจกต์>.vercel.app`

## โครงสร้างหน้า

| URL | ใคร | หน้าที่ |
|---|---|---|
| `/track` | ลูกค้า (ไม่ต้อง login) | ค้นหาสถานะงานด้วยเลขที่ใบงาน / ใบรับเครื่อง |
| `/login` | พนักงาน | เข้าสู่ระบบ |
| `/staff` | พนักงานทุกบทบาท | รายการใบงาน (หน้าแรกหลัง login) |

```
src/
  app/
    (public)/track/     หน้าลูกค้า
    (staff)/login/      หน้า login
    (staff)/staff/      หน้าพนักงาน (มี layout ตรวจ login)
  components/ui/        component จาก shadcn/ui
  lib/
    api.ts              ฟังก์ชันเรียก backend (แนบ token ให้อัตโนมัติ)
    auth.ts             เก็บ/ลบ token ของพนักงาน
    types.ts            ชนิดข้อมูลจาก backend
docs/openapi.json       สเปก API ทั้งหมดของ backend
```

## เพิ่ม component ของ shadcn/ui

```bash
npx shadcn@latest add dialog select table
```

## Deploy บน Vercel

1. Import repo นี้ใน Vercel (Framework: Next.js — ค่าเริ่มต้นใช้ได้เลย)
2. ตั้ง Environment Variable `NEXT_PUBLIC_API_URL` เป็น URL ของ Railway
3. เพิ่มโดเมน Vercel ที่ได้ลงใน `CORS_ORIGINS` ของ backend บน Railway
