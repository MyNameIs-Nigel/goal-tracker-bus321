# Site identity

**Status:** Approved
**Phase:** 4
**Routes:** all routes

## Purpose

Give the tracker a clear, consistent identity in browser tabs, bookmarks, and link previews without depending on uploaded or owner-authored artwork.

## Roles

The generated assets are public and identical for the owner, partners, viewers, and signed-out visitors.

## Scenarios

### ID-01 Link previews use a generated Open Graph image

- **Given** any tracker URL is shared with a service that reads Open Graph metadata
- **When** the service requests the default Open Graph image
- **Then** it receives a 1200 × 630 generated image that identifies the app as "BUS 321 Goal Tracker" and describes it as "Daily progress. Shared accountability."

### ID-02 Browser surfaces use a generated favicon

- **Given** a browser loads any tracker route
- **When** it requests the app icon
- **Then** it receives a square generated icon with the tracker's green visual identity and a check mark that remains recognizable at favicon size

## UI

Both assets use the existing calm green accent, dark neutral foreground, and simple typography. The favicon must remain recognizable at small sizes; the Open Graph image must preserve generous spacing and high contrast.

## Out of scope

- Owner-uploaded branding or per-page social images
- Platform-specific marketing art
- Animated icons
