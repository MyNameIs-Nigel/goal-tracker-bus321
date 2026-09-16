# Contract & vision

**Status:** Approved
**Phase:** 3
**Routes:** `/contract`
**Rules:** [DATA_MODEL.md § documents](../DATA_MODEL.md#documents), [§ settings](../DATA_MODEL.md#settings), [ARCHITECTURE.md § Rich text](../ARCHITECTURE.md#rich-text)

## Purpose

The assignment's two written pieces — *who I want to become* and the *accountability contract* — live here as rich text the owner writes in the app. Partners read the consequence they're enforcing, and see who the partners are. Contract dates are set here too, because they drive the counting rules.

## Roles

Owner: edit both documents and the dates. Everyone: read.

## Scenarios

### CV-01 The page shows the two documents, the dates, and the partners
- **Given** both documents written, `contract_start = 2026-09-19`, `contract_end = 2026-12-18`, partners Alice and Bob
- **When** anyone opens `/contract`
- **Then** the page shows **"Sep 19 – Dec 18, 2026"** under the title, a section **"Who I want to become"** with the vision, a section **"Accountability contract"** with the contract, and **"Accountability partners: Alice, Bob"**

### CV-02 Owner edits a document
- **Given** the owner on `/contract`
- **When** they press **"Edit"** on the contract section
- **Then** an editor replaces the rendered text with a toolbar of **Bold · Italic · Heading · Bullet list · Numbered list · Link** and **"Save"** / **"Cancel"** buttons
- **And when** they type, apply bold, and press Save
- **Then** the rendered section shows the new content and `documents.contract.updated_at` advances

### CV-03 Saved HTML is sanitized
- **When** a save is invoked (even directly) with `<p>Hi</p><script>alert(1)</script><a href="javascript:x" onclick="y">bad</a><a href="https://ok.example">ok</a>`
- **Then** what is stored contains `<p>Hi</p>`, contains no `<script>`, no `onclick`, and no `javascript:` href; the safe link is kept as `<a href="https://ok.example" rel="noopener noreferrer" target="_blank">ok</a>`
- **And** the rendered page contains no `<script>` element

### CV-04 Size limit
- **When** a save exceeds 20,000 characters of HTML
- **Then** **"This is too long — keep it under 20,000 characters"** and nothing is saved

### CV-05 Last updated
- **Given** the vision was saved by the owner on Sep 18
- **Then** under the section: **"Last updated Sep 18 by Nigel"** (owner's first name from Google)

### CV-06 Empty documents
- **Given** an empty contract document
- **Then** the owner sees the placeholder **"Write your accountability contract…"** with the Edit button; others see **"Not written yet."**

### CV-07 Owner sets the contract dates
- **Given** the owner
- **When** they press **"Edit dates"**, set start `2026-09-19` and end `2026-12-18`, and save
- **Then** the header shows the range and `/today` reflects "Day N of 91"
- **When** end is before start → **"End date can't be before start date"** and nothing is saved

### CV-08 Cancel discards
- **Given** the editor open with unsaved changes
- **When** the owner presses **"Cancel"**
- **Then** the rendered text is unchanged

### CV-09 Non-owners can't write
- **Given** a partner or viewer
- **Then** no Edit / Edit dates controls; direct save actions are rejected (ROLE-03)

### CV-10 Rendered documents look like documents
- **Given** a stored document with headings, lists and a link
- **Then** the rendered section shows them with sensible typography (headings, bullets, link underlined and opening in a new tab)

## UI

Reading mode is a comfortable measure (≈ 65 characters per line on desktop, full width on phones), generous line height. The editor is the same box with a slim toolbar above it — no modal. Order on the page: dates → vision → contract → partners.

## Out of scope

Version history, comments, multiple documents, markdown import, images.
