# Appearance

**Status:** Approved — requested by Nigel
**Phase:** 4
**Routes:** all pages; selector in the profile dropdown

Everyone can choose Light / System / Dark above Sign out. Default is System.
The preference belongs to this browser, persists across reloads and sign-out,
and never changes tracker data or permissions. No database change.

## Scenarios

### THEME-01 Three-position appearance control
- **Given** any signed-in role
- **When** they open the profile dropdown
- **Then** an Appearance radio group offers Light, System, Dark above Sign out, with System selected by default

### THEME-02 Explicit appearance persists
- **Given** the device uses dark mode
- **When** Light is selected
- **Then** all pages use light colours immediately and after navigation and reload; Dark overrides a light device in the same way

### THEME-03 System follows the device
- **Given** System is selected
- **When** device appearance changes
- **Then** the page follows it without a reload

### THEME-04 Keyboard and dismissal
- **Given** the dropdown is open
- **When** using Tab and arrow keys
- **Then** the appearance radios are operable with visible focus; Escape closes the dropdown and restores avatar focus; outside clicks close it

### THEME-05 Unavailable storage is harmless
- **Given** storage is blocked or a saved value is invalid
- **Then** the initial appearance follows the system and controls still work for this page

### THEME-06 First paint and reduced motion
- **Given** a saved preference
- **When** loading the page
- **Then** a small inline head script applies it before body paint; reduced motion disables the sliding animation

## UI

A rounded segmented rail with sun, monitor and moon icons, short visible labels,
and a green-tinted sliding selection pill. Targets are at least 44px high.
The profile panel uses a labelled disclosure region (not an ARIA menu, since
it contains native form controls). Focus remains in normal document order.
The avatar and Sign out also have at least 44px targets.

Light and dark palettes retain the calm green accent. Native form controls
follow the selected colour scheme. System works through CSS even without JS.
