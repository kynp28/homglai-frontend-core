import { code128Bars } from "@/lib/code128";

/** บาร์โค้ด Code 128 เป็น SVG (คมเวลาพิมพ์ เครื่องยิง USB ทั่วไปอ่านได้) */
export function Barcode({ value, height = 40, moduleWidth = 1.5, className }: { value: string; height?: number; moduleWidth?: number; className?: string }) {
  const { bars, width } = code128Bars(value);
  return (
    <svg
      role="img"
      aria-label={`บาร์โค้ด ${value}`}
      width={width * moduleWidth}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={width} height={height} fill="#fff" />
      {bars.map(([x, w]) => (
        <rect key={x} x={x} y={0} width={w} height={height} fill="#000" />
      ))}
    </svg>
  );
}
