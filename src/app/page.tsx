import { redirect } from "next/navigation";

// หน้าแรกส่งลูกค้าไปหน้าเช็กสถานะงาน
export default function Home() {
  redirect("/track");
}
