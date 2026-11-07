import { encodeQr, qrSvgPath } from "@/lib/qr";

/** QR Code เป็น SVG (คมชัดเวลาพิมพ์) */
export function QrCode({ value, size = 128, className }: { value: string; size?: number; className?: string }) {
  const { path, size: viewBox } = qrSvgPath(encodeQr(value));
  return (
    <svg
      role="img"
      aria-label={`QR Code: ${value}`}
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={viewBox} height={viewBox} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
