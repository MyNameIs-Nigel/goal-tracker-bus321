import { ImageResponse } from "next/og";

export const alt = "BUS 321 Goal Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#f4f7f5",
        color: "#14181a",
        display: "flex",
        fontFamily: "sans-serif",
        height: "100%",
        padding: 48,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "2px solid #dce5e0",
          borderRadius: 32,
          boxShadow: "0 24px 64px rgba(20, 24, 26, 0.08)",
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#2f7d5a",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "54px 48px",
            width: 294,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#ffffff",
              borderRadius: 28,
              color: "#2f7d5a",
              display: "flex",
              fontSize: 50,
              fontWeight: 800,
              height: 112,
              justifyContent: "center",
              width: 112,
            }}
          >
            ✓
          </div>
          <div
            style={{
              color: "rgba(255, 255, 255, 0.72)",
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Fall 2026
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            padding: "52px 68px",
          }}
        >
          <div
            style={{
              color: "#2f7d5a",
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 24,
              textTransform: "uppercase",
            }}
          >
            BUS 321
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 750,
              letterSpacing: -3,
              lineHeight: 1.02,
              maxWidth: 680,
            }}
          >
            Goal Tracker
          </div>
          <div
            style={{
              color: "#5c6a70",
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              marginTop: 30,
            }}
          >
            Daily progress. Shared accountability.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
