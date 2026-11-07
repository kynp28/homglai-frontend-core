import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Homglai Service — ติดตามงานซ่อม",
  description: "ระบบติดตามงานซ่อมเครื่องชงกาแฟ หอมไกล",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={notoThai.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
