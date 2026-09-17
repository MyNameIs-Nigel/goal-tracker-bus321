import { describe, expect, test } from "vitest";

import generateIcon, {
  contentType as iconContentType,
  size as iconSize,
} from "./icon";
import generateOpenGraphImage, {
  alt as openGraphAlt,
  contentType as openGraphContentType,
  size as openGraphSize,
} from "./opengraph-image";

describe("generated site identity", () => {
  test("ID-01 link previews use a generated Open Graph image", () => {
    expect(openGraphAlt).toBe("BUS 321 Goal Tracker");
    expect(openGraphSize).toEqual({ width: 1200, height: 630 });
    expect(openGraphContentType).toBe("image/png");

    const response = generateOpenGraphImage();
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  test("ID-02 browser surfaces use a generated favicon", () => {
    expect(iconSize).toEqual({ width: 32, height: 32 });
    expect(iconContentType).toBe("image/png");

    const response = generateIcon();
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
