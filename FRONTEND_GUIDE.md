# HMS Frontend Design Guide
 
> **Audience:** the AI agent / developer building the HMS frontend.
> **Companion document:** `FRONTEND_HANDOVER.md` (API contract, auth, tenancy, versioning).
> **Rule of precedence:** the handover file defines *what* to build and how it talks to the backend. This file defines *how it looks, feels and behaves*. If the two ever conflict on behaviour (permissions, auth, `If-Match`, pagination), the handover wins.
 
---
 
## 1. Design Vision
 
**Name: "Neo-Clinical"**
 
A hospital system must feel *calm, trustworthy and fast*, yet the product should feel modern, not like legacy medical software. Neo-Clinical blends:
 
- **Clinical clarity**: lots of air, strong hierarchy, zero decorative noise on data-heavy screens.
- **New-age softness**: large rounded corners, soft layered shadows, subtle gradients, bento-style card grids.
- **Quiet glass**: translucency only on overlays (command palette, drawers, sticky headers), never behind dense data.
- **Confident colour**: one signature teal-to-violet gradient used sparingly as a brand moment; everything else is neutral so clinical status colours (success / warning / danger) are never ambiguous.
**Personality keywords:** calm, precise, airy, confident, humane.
**Anti-goals:** loud gradients everywhere, neumorphic "pressed" controls (poor contrast), tiny grey-on-grey text, dense legacy-style tables with no breathing room, anything that looks like a template dashboard.
 
---
 
## 2. Colour System
 
Teal is the primary brand colour: it reads as medical and fresh without the cliché of hospital blue. A cool violet is the secondary, used for gradients and highlights only.
 
### 2.1 Design tokens (copy into the global stylesheet)
 
```css
:root {
  /* Brand */
  --brand-50:  #E8FBF7;
  --brand-100: #C6F5EA;
  --brand-300: #5FE0C6;
  --brand-500: #14B8A6;
  --brand-600: #0E9F8E;
  --brand-700: #0B7F73;   /* use for text + filled buttons (passes AA with white) */
  --brand-900: #07433E;
 
  --accent-400: #8B7BFF;
  --accent-500: #6D5EF5;  /* secondary / gradient partner */
 
  --gradient-brand: linear-gradient(135deg, #14B8A6 0%, #6D5EF5 100%);
  --gradient-soft:  linear-gradient(135deg, rgba(20,184,166,.12) 0%, rgba(109,94,245,.12) 100%);
 
  /* Semantic (clinical status) */
  --success: #16A34A;  --success-bg: #E7F8EE;
  --warning: #D97706;  --warning-bg: #FEF3E2;
  --danger:  #E5484D;  --danger-bg:  #FDECEC;
  --info:    #3B82F6;  --info-bg:    #E8F1FE;
 
  /* Light theme surfaces */
  --bg:         #F4F8F8;
  --surface:    #FFFFFF;
  --surface-2:  #F9FBFB;   /* nested cards, table stripes */
  --border:     #E1EAEA;
  --text:       #0F1F26;
  --text-muted: #5B6B73;
  --text-faint: #8A9AA1;
 
  /* Shape */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;
 
  /* Elevation (soft, layered, slightly teal-tinted) */
  --shadow-1: 0 1px 2px rgba(11,31,38,.05), 0 1px 1px rgba(11,31,38,.03);
  --shadow-2: 0 4px 12px rgba(11,31,38,.06), 0 1px 3px rgba(11,31,38,.04);
  --shadow-3: 0 12px 32px rgba(11,31,38,.10), 0 2px 6px rgba(11,31,38,.04);
  --ring: 0 0 0 3px rgba(20,184,166,.35);
 
  /* Glass (overlays only) */
  --glass-bg: rgba(255,255,255,.72);
  --glass-border: rgba(255,255,255,.6);
  --glass-blur: 16px;
}
 
[data-theme="dark"] {
  --bg:         #071013;
  --surface:    #0D1A1F;
  --surface-2:  #112228;
  --border:     #1F3239;
  --text:       #E6F1F2;
  --text-muted: #8FA5AB;
  --text-faint: #62797F;
 
  --success-bg: rgba(22,163,74,.16);
  --warning-bg: rgba(217,119,6,.18);
  --danger-bg:  rgba(229,72,77,.16);
  --info-bg:    rgba(59,130,246,.16);
 
  --shadow-1: 0 1px 2px rgba(0,0,0,.4);
  --shadow-2: 0 6px 16px rgba(0,0,0,.4);
  --shadow-3: 0 16px 40px rgba(0,0,0,.5);
  --glass-bg: rgba(13,26,31,.70);
  --glass-border: rgba(255,255,255,.06);
}
```
 
### 2.2 Colour rules
 
1. **60 / 30 / 10**: 60% neutral surfaces, 30% text and borders, 10% brand/accent.
2. The brand gradient is allowed on: the login hero, primary CTA on empty states, avatar rings, progress indicators, and one "hero" stat card per page. Nowhere else.
3. Filled primary buttons use `--brand-700` with white text, not `--brand-500`.
4. Status is **never colour-only**. Always pair colour with an icon and a text label (e.g. a green dot + "Closed", amber triangle + "Version conflict").
5. Support light, dark and system preference. Default to **system**. Persist the user's choice in `localStorage` (UI preference only, never tokens).
6. Never use pure `#000` or pure `#FFF` for text on large areas; use the tokens.
---
 
## 3. Typography
 
| Role | Font | Notes |
|---|---|---|
| UI + body | **Plus Jakarta Sans** (fallback: Inter, system-ui) | Friendly geometric, great at small sizes |
| Display / headings | **Plus Jakarta Sans** 600–700, tight tracking | Same family keeps it cohesive |
| IDs, MRNs, timestamps, versions, code | **JetBrains Mono** | Tabular, unambiguous 0/O and 1/l, which matters for medical record numbers |
 
Use `font-variant-numeric: tabular-nums` on vitals, tables and any numeric column.
 
**Scale (rem, mobile to desktop via `clamp`)**
 
| Token | Size | Weight | Use |
|---|---|---|---|
| `display` | clamp(2rem, 4vw, 3rem) | 700 | Login hero only |
| `h1` | clamp(1.5rem, 2.4vw, 2rem) | 700 | Page titles |
| `h2` | 1.25rem | 600 | Section titles |
| `h3` | 1.0625rem | 600 | Card titles |
| `body` | 0.9375rem (15px) | 400 | Default |
| `small` | 0.8125rem | 500 | Meta, helper text |
| `micro` | 0.75rem | 600, uppercase, +0.06em | Table headers, overlines |
 
Line height: 1.5 body, 1.2 headings. Maximum line length for prose: 70ch.
 
---
 
## 4. Layout, Spacing and Responsiveness
 
### 4.1 Spacing
4-pt base grid: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72`. Cards use 20–24px padding on desktop, 16px on mobile. Page gutters: 16px (mobile), 24px (tablet), 32px (desktop).
 
### 4.2 Breakpoints (mobile-first)
 
| Name | Min width | Layout behaviour |
|---|---|---|
| `xs` | 0 | Single column, bottom tab bar, full-screen sheets |
| `sm` | 480px | Larger touch targets, 2-col stat cards |
| `md` | 768px | Collapsed icon rail sidebar, 2–3 col bento |
| `lg` | 1024px | Full sidebar (264px), master–detail views |
| `xl` | 1280px | 12-col bento, optional right context panel |
| `2xl` | 1536px | Content max-width 1440px, centred |
 
### 4.3 App shell
 
- **Desktop (lg+):** left sidebar (collapsible to 72px icon rail), top bar with global search / command palette (`Ctrl/⌘ + K`), tenant badge, theme toggle, user menu.
- **Tablet (md):** icon-rail sidebar, expands as an overlay on tap.
- **Mobile (xs–sm):** top bar (title + search icon + avatar) and a **bottom tab bar** with max 5 items (Dashboard, Patients, Visits, Search, Profile). Detail views open as full-screen pages; forms and filters open as **bottom sheets**.
- Sidebar items are rendered **only if the user has the matching permission** (see §8.1).
### 4.4 Bento grid
Dashboards and patient overview use a bento grid: cards of varied spans (1×1, 2×1, 2×2) on a 12-col grid at `xl`, collapsing to 6 cols at `md` and 1 col at `xs`. Keep gap at 16px (mobile) / 20px (desktop). Every card has one clear job and one title.
 
### 4.5 Touch and density
- Minimum touch target **44×44px** on touch devices.
- Offer a **Comfortable / Compact** density toggle for tables (row height 56px vs 44px). Default comfortable.
- No horizontal page scroll on any breakpoint. Wide tables scroll inside their own container or transform into stacked cards on `xs`.
---
 
## 5. Shape, Elevation and Surface Language
 
- Cards: `--radius-lg`, 1px `--border`, `--shadow-1`; on hover (interactive cards only) lift to `--shadow-2` with 2px translateY.
- Inputs and buttons: `--radius-md`.
- Chips, badges, avatars, toggles: `--radius-pill`.
- Modals / sheets: `--radius-xl` on exposed corners.
- Glass is allowed on: sticky top bar (after scroll), command palette, popovers, toasts, drawers. Never behind tables, forms or vitals.
- A faint noise or radial-gradient wash (brand at ~6% opacity) may sit behind the page background in the top-left corner for depth. Keep it static (no animated gradients).
---
 
## 6. Iconography and Imagery
 
- Icon set: **Lucide** (consistent 1.75px stroke, 20px default, 16px in dense UI).
- Do not mix icon families.
- Illustrations (empty states, login): flat, soft, brand-tinted, geometric. No stock hospital photography, no cartoon doctors.
- Patient avatars: initials on a tinted circle (hash patient ID to one of 6 soft tints). If a photo is ever supported, use a 2px gradient ring.
---
 
## 7. Motion
 
Purposeful, quick and quiet. Healthcare users are often in a hurry.
 
| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--dur-fast` | 120ms (hover, press) |
| `--dur-base` | 200ms (menus, tabs) |
| `--dur-slow` | 320ms (sheets, route transitions) |
 
Rules:
1. Animate `opacity` and `transform` only.
2. Route changes: 8px fade-up, 200ms. Lists: stagger max 6 items at 30ms.
3. Skeleton shimmer for loading (never a lone spinner on a page-level load). Spinners only inside buttons.
4. **Respect `prefers-reduced-motion`**: disable transforms and shimmer, keep opacity fades.
5. No auto-playing or looping decorative animation anywhere.
---
 
## 8. Product-Specific UX (mapped to the backend handover)
 
### 8.1 Auth and permission gating
 
- **Login screen:** split layout on `lg+` (left: brand gradient panel with a short product line and subtle abstract shapes; right: form card). On mobile: gradient header strip above the form card. Fields: email, password (show/hide toggle), "Remember this device" mapped to `device_label`. Inline validation, clear error banner for 401, and a disabled-with-spinner submit state.
- Session bootstrap: call `GET /api/v1/auth/me` on app load. Show a branded skeleton shell while it resolves, then route.
- **Permission gating pattern** (implement as a reusable `<Can permission="patient:create">` component and a `usePermission()` hook):
  - **Hide** navigation and entire pages the user can never use.
  - **Disable with tooltip** ("You need `visit:close` permission") for actions inside an otherwise visible page.
  - Always treat a backend `403` as authoritative: show a friendly "No access" state, never a crash.
- Silent refresh: on `401`, attempt one `POST /api/v1/auth/refresh`, then retry once. If that fails, redirect to login and preserve the intended URL.
### 8.2 Tenant context
 
- Show a **tenant badge** in the top bar (name + small coloured monogram) so staff always know which hospital context they are in.
- Do not hardcode brand colours per tenant. Support an optional tenant **accent override** token (`--brand-700` / `--brand-500`) loaded from tenant metadata, falling back to Neo-Clinical teal.
- Never cache or display data across tenants; clear all client caches on logout and tenant switch.
### 8.3 Dashboard (bento)
 
Suggested cards (use only data the API actually supports; show nothing fabricated):
 
1. **Greeting hero** (gradient-soft background): "Good morning, {firstName}" + tenant name + quick actions (New patient, Open visit).
2. **Patients** stat card with sparkline placeholder.
3. **Open visits** stat card, with amber emphasis if numbers are high.
4. **Recent patients** list (5 items).
5. **Recent visits** timeline.
6. **Shortcuts** card (permission-filtered).
Empty and loading states are mandatory for every card.
 
### 8.4 Patient directory
 
- Header: title, count, primary button **New patient** (gated by `patient:create`), search input, filter chips.
- Desktop: data table with sticky header, avatar + name, MRN in mono, age/sex, last visit, status badge, row action menu.
- Mobile: stacked **patient cards** (avatar, name, MRN, last visit, chevron).
- **Cursor pagination:** use a "Load more" button or infinite scroll with `IntersectionObserver`. Never show numbered pages or total page counts since the API is cursor-based. Keep `limit` default at 25 (allowed 1–100).
- Search is debounced (300ms) with a visible clear button.
### 8.5 Patient detail
 
- Sticky **patient header** card: avatar, name, MRN (mono + copy button), demographics, allergy / alert chips in warning tones, primary action **Start visit**.
- Tabs (sticky on scroll): **Overview · Visits · Vitals · Attachments**. On mobile, tabs become a horizontally scrollable pill bar.
- Overview uses a bento layout: demographics, contacts, latest vitals, open visit callout.
- Edit patient opens a right-side drawer (`lg+`) or full-screen sheet (mobile).
### 8.6 Visit flow (create / open / edit / close)
 
- Visit status uses a **badge**: Open (teal), Closed (neutral with lock icon).
- Visit detail is a two-column layout on `lg+` (notes/clinical content left, meta + vitals + attachments right). On mobile, a single column with collapsible sections.
- **Close visit** is a deliberate action: confirmation dialog explaining it locks the visit, with the destructive-adjacent style (outlined danger, not filled red).
- Autosave drafts of in-progress forms locally (in memory or `sessionStorage`) so a refresh doesn't lose notes. Clearly show "Unsaved changes".
### 8.7 Optimistic concurrency UX (`If-Match`)
 
This is a core part of the experience. Implement exactly:
 
1. Capture the ETag/version from each `GET` and store it with the entity in state.
2. Send it as `If-Match` on `PATCH` and `close`.
3. On success, replace the stored version with the new one from the response headers.
4. On **`412 Precondition Failed`**, open a **Conflict dialog** (never a silent failure):
   - Title: "This record was updated by someone else"
   - Body: short explanation + changed-by/at if available.
   - Actions: **Reload latest** (primary), **Review my changes** (secondary, shows the user's unsaved values so nothing is lost), **Cancel**.
5. Never auto-overwrite. Never retry a `412` automatically.
### 8.8 Attachments (images)
 
- Uploader: drag-and-drop zone with dashed brand-tinted border, "Browse files" button, camera capture on mobile (`accept="image/*"` + `capture`).
- Client-side checks: type and size before upload; show per-file progress bars and per-file retry.
- Use multipart upload as per the handover; do not base64 encode.
- Display via **presigned URLs** in a responsive thumbnail grid (2 cols mobile, 4–5 desktop) with lazy loading, blur-up placeholder and a lightbox with keyboard navigation (←/→/Esc), pinch zoom on touch.
- Presigned URLs expire: on image load error, silently re-fetch a fresh URL once before showing the broken-image state.
- Treat images as sensitive: no caching in public CDNs, no filenames containing patient names in the UI.
---
 
## 9. Component Specifications
 
Build a small internal component library first, then screens. Recommended foundation: **React + TypeScript + Tailwind CSS + Radix UI primitives (shadcn/ui style)**, **TanStack Query** for server state, **React Hook Form + Zod** for forms, **Lucide** icons, **Framer Motion** (or CSS) for motion. If the project already uses a different stack, keep every rule in this document and map the tokens accordingly.
 
| Component | Spec |
|---|---|
| **Button** | Variants: primary (solid `--brand-700`), secondary (surface + border), ghost, danger-outline, gradient (hero CTAs only). Sizes: sm 36px, md 44px, lg 52px. Loading state replaces label with spinner and keeps width. Focus ring `--ring`. |
| **Input / Select / Textarea** | 44px height, `--radius-md`, 1px border, label above (never placeholder-as-label), helper and error text below, error uses icon + `--danger`. |
| **Card** | Surface, 1px border, `--radius-lg`, optional header (title + action). Interactive variant has hover lift. |
| **Badge / Chip** | Pill, tinted background + same-hue text + leading dot or icon. |
| **Table** | Sticky header, micro-style header labels, zebra via `--surface-2` (optional), row hover tint, trailing action menu. Becomes cards on `xs`. |
| **Tabs** | Underline style on desktop with animated indicator; pill style on mobile. |
| **Dialog / Drawer / Sheet** | Dialog centred (max 520px); Drawer right (max 480px); Sheet bottom on mobile with grab handle. Focus trap, `Esc` closes, scrim `rgba(7,16,19,.5)` + blur. |
| **Toast** | Glass surface, top-right desktop / top-centre mobile, 4s, with icon and optional undo. Errors persist until dismissed. |
| **Skeleton** | Matches final layout shape, shimmer 1.4s. |
| **Empty state** | Illustration, one-line title, one-line help, one primary action (permission-aware). |
| **Command palette** | `Ctrl/⌘+K`, glass, search patients (cursor-paged), jump to pages, quick actions. |
| **Avatar** | Initials, tinted, sizes 24/32/40/56. |
| **Stat card** | Label (micro), value (display-ish, tabular nums), delta chip, optional sparkline. |
 
---
 
## 10. Data, States and Error Handling UX
 
Every data view must define **loading, empty, error, and forbidden** states.
 
- Parse the standard envelope (`status`, `status_code`, `message`, `data`) in one place. Surface `message` to the user where it is human-friendly; otherwise map by status code.
- Error copy is plain and actionable: say what happened and what to do next. Never show stack traces, raw JSON or internal IDs in toasts.
- Network loss: show a persistent but unobtrusive offline banner; queue nothing silently for clinical writes. Block submit and explain.
- Treat slow networks as the normal case: skeletons, small bundles, route-level code splitting, lazy images, and no layout shift.
- Form validation is inline on blur, summarised on submit with focus moved to the first error.
---
 
## 11. Accessibility (non-negotiable)
 
- Target **WCAG 2.2 AA**.
- Text contrast ≥ 4.5:1 (3:1 for large text and UI boundaries). Do not use `--brand-500` or lighter for text on white.
- Full keyboard operability, visible focus ring on every interactive element, logical tab order, skip-to-content link.
- Semantic HTML first; ARIA only to fill gaps. Dialogs/menus via Radix to get correct roles and focus management.
- Announce async results (toasts, save success, conflicts) with `aria-live`.
- Support 200% zoom and text-only scaling without loss of function.
- Never rely on colour alone, including charts and status.
- Provide `alt` for meaningful images; attachments need a user-facing label.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
---
 
## 12. Security and Privacy in the UI
 
- Mask sensitive identifiers when idle: blur patient detail after N minutes of inactivity (configurable) and require a click to reveal.
- Never put patient names, MRNs or tokens in URLs, document titles or analytics events. Use opaque IDs.
- Do not store access/refresh tokens in `localStorage`. Follow the handover: HttpOnly cookies with `credentials: "include"`, or the access token in memory only.
- Auto-logout on idle with a 60-second warning dialog.
- Hide the app content in the OS task switcher on mobile where supported (privacy screen).
---
 
## 13. Suggested Project Structure
 
```
src/
  app/                 # routes, layouts, providers
  components/ui/       # design-system primitives (Button, Card, ...)
  components/domain/   # PatientCard, VisitBadge, ConflictDialog, Uploader
  features/
    auth/  tenant/  patients/  visits/  attachments/
  lib/
    api/               # fetchWithAuth, envelope parser, ETag/If-Match helpers
    permissions/       # <Can/>, usePermission
    theme/             # tokens, theme provider
  styles/              # tokens.css, globals.css
  types/               # envelope + OpenAPI-derived types
```
 
Generate API types from `openapi.json` rather than hand-writing them where possible.
 
---
 
## 14. Build Order for the Agent
 
1. Tokens, global CSS, theme provider (light / dark / system), fonts.
2. UI primitives (Button, Input, Card, Badge, Dialog, Sheet, Toast, Skeleton, Table, Tabs).
3. API client: base URL, credentials, envelope parsing, refresh-on-401, ETag capture.
4. Auth screens + session bootstrap + permission gate.
5. App shell (sidebar / bottom tabs, top bar, tenant badge, command palette).
6. Dashboard bento.
7. Patient list, then patient detail.
8. Visit create / edit / close with the `412` conflict flow.
9. Attachment uploader and gallery.
10. Polish: motion, empty states, a11y audit, responsive QA at 360, 768, 1024 and 1440px widths.
---
 
## 15. Definition of Done (checklist for every screen)
 
- [ ] Uses tokens only. No hardcoded hex values or magic spacing.
- [ ] Works at 360px, 768px, 1024px and 1440px with no horizontal page scroll.
- [ ] Light and dark themes both verified.
- [ ] Loading, empty, error and forbidden states implemented.
- [ ] Permission-gated actions hidden or disabled with explanation.
- [ ] Keyboard-only walkthrough passes; focus ring visible; contrast AA.
- [ ] Reduced-motion respected.
- [ ] `If-Match` sent on all update/close calls; `412` handled with the conflict dialog.
- [ ] Lists use cursor pagination, not page numbers.
- [ ] No sensitive data in URLs, logs or browser storage.
---
 
## 16. Quick Reference
 
| Thing | Value |
|---|---|
| Primary | `#0B7F73` (text/buttons), `#14B8A6` (accents/fills) |
| Secondary | `#6D5EF5` |
| Brand gradient | `135deg, #14B8A6 → #6D5EF5` |
| Light bg / surface | `#F4F8F8` / `#FFFFFF` |
| Dark bg / surface | `#071013` / `#0D1A1F` |
| Success / Warning / Danger / Info | `#16A34A` / `#D97706` / `#E5484D` / `#3B82F6` |
| Radii | 10 / 14 / 20 / 28 / pill |
| Fonts | Plus Jakarta Sans, JetBrains Mono |
| Icons | Lucide, 1.75px stroke |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Touch target | ≥ 44px |
| Accessibility | WCAG 2.2 AA |
 