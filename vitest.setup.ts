import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `globals` is off, so React Testing Library's automatic cleanup does not
// register itself. Do it explicitly.
afterEach(cleanup);
