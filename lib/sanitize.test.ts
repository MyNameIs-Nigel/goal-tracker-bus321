import { expect, test } from "vitest";

import { sanitizeDocumentHtml } from "./sanitize";

test("CV-03 scripts, event handlers and javascript: hrefs are stripped; safe links are kept", () => {
  const out = sanitizeDocumentHtml(
    '<p>Hi</p><script>alert(1)</script><a href="javascript:x" onclick="y">bad</a><a href="https://ok.example">ok</a>',
  );
  expect(out).toContain("<p>Hi</p>");
  expect(out).not.toContain("<script");
  expect(out).not.toContain("alert(1)");
  expect(out).not.toContain("onclick");
  expect(out).not.toContain("javascript:");
  expect(out).toContain(
    '<a href="https://ok.example" rel="noopener noreferrer" target="_blank">ok</a>',
  );
});

test("CV-03 only the allowlist survives: p h2 h3 strong em ul ol li a br blockquote", () => {
  const out = sanitizeDocumentHtml(
    '<h1>Big</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><p style="color:red" class="x">Para<br>next</p><ul><li><p>one</p></li></ul><ol><li>two</li></ol><blockquote>q</blockquote><strong>b</strong><em>i</em><u>u</u><img src="x.png"><iframe src="https://evil"></iframe><div>d</div>',
  );
  expect(out).toBe(
    "Big<h2>Two</h2><h3>Three</h3>Four<p>Para<br />next</p><ul><li><p>one</p></li></ul><ol><li>two</li></ol><blockquote>q</blockquote><strong>b</strong><em>i</em>ud",
  );
});

test("CV-03 links: only http(s) hrefs; every other attribute is dropped", () => {
  expect(
    sanitizeDocumentHtml('<a href="http://a.example" title="t" id="i">a</a>'),
  ).toBe(
    '<a href="http://a.example" rel="noopener noreferrer" target="_blank">a</a>',
  );
  expect(sanitizeDocumentHtml('<a href="mailto:x@y.z">m</a>')).toBe("m");
  expect(sanitizeDocumentHtml("<a>no href</a>")).toBe("no href");
});

test("CV-03 an empty or whitespace-only document sanitizes to empty", () => {
  expect(sanitizeDocumentHtml("")).toBe("");
  expect(sanitizeDocumentHtml("<p></p>")).toBe("<p></p>");
});
