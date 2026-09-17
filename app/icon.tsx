import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#2f7d5a",
        borderRadius: 7,
        color: "#ffffff",
        display: "flex",
        fontFamily: "sans-serif",
        fontSize: 22,
        fontWeight: 800,
        height: "100%",
        justifyContent: "center",
        lineHeight: 1,
        width: "100%",
      }}
    >
      ✓
    </div>,
    size,
  );
}
