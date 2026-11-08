// LINE LIFF SDK โหลดจาก CDN ของ LINE (ไม่ต้องลง package)
const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

export interface Liff {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(config?: { redirectUri?: string }): void;
  getAccessToken(): string | null;
  getProfile(): Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
  isInClient(): boolean;
  closeWindow(): void;
}

declare global {
  interface Window {
    liff?: Liff;
  }
}

let loading: Promise<Liff> | null = null;

/** โหลด SDK แล้ว init LIFF; ถ้ายังไม่ได้ login LINE จะพาไปหน้า login ของ LINE */
export function initLiff(liffId: string): Promise<Liff> {
  if (!liffId) return Promise.reject(new Error("ยังไม่ได้ตั้งค่า LIFF ID"));
  if (!loading) {
    loading = new Promise<Liff>((resolve, reject) => {
      const ready = async () => {
        const liff = window.liff;
        if (!liff) return reject(new Error("โหลด LINE SDK ไม่สำเร็จ"));
        try {
          await liff.init({ liffId });
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
            return; // กำลังพาไปหน้า login ของ LINE
          }
          resolve(liff);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("เริ่มต้น LIFF ไม่สำเร็จ"));
        }
      };
      if (window.liff) return void ready();
      const script = document.createElement("script");
      script.src = LIFF_SDK_URL;
      script.async = true;
      script.onload = () => void ready();
      script.onerror = () => reject(new Error("โหลด LINE SDK ไม่สำเร็จ"));
      document.head.appendChild(script);
    });
  }
  return loading;
}
