/**
 * docs/ARCHITECTURE.md § Rich text — the allowlist every saved document goes
 * through (CV-03). Pure: a thin wrapper over `sanitize-html` with the policy
 * pinned here so the tests read as the spec.
 */
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "br",
  "blockquote",
];

const SAFE_HREF = /^https?:\/\//i;

export function sanitizeDocumentHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      // A link is kept only with an http(s) href, and only with exactly these
      // attributes; anything else is left as a bare <a> for the pass below.
      // (Renaming the tag here would make sanitize-html mislabel the *next*
      // anchor's closing tag.)
      a: (tagName, attribs) => {
        const safe: Record<string, string> =
          attribs.href && SAFE_HREF.test(attribs.href)
            ? {
                href: attribs.href,
                rel: "noopener noreferrer",
                target: "_blank",
              }
            : {};
        return { tagName, attribs: safe };
      },
    },
  });
  // A bare <a> (no safe href) degrades to its text. Anchors can't nest, so
  // the lazy match ends at this anchor's own closing tag.
  return clean.replace(/<a>([\s\S]*?)<\/a>/g, "$1");
}
