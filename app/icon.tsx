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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="m5 12 4 4L19 6"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    size,
  );
}
