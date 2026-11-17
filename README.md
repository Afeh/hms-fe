# hms-fe

The frontend for the Hospital Management System. Implements the "Neo-Clinical" design system in
`FRONTEND_GUIDE.md` against the API contract in `../hms-be/FRONTEND_HANDOVER.md`.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (tokens from the guide live in `src/styles/tokens.css`)
- TanStack Query for server state
- React Hook Form + Zod for forms
- Radix UI primitives for dialogs, menus, tabs and tooltips
- Lucide icons

## Run locally

The backend must be running on `http://127.0.0.1:8000` (see `../hms-be/README.md`).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The dev server proxies `/api` to the backend, so auth cookies are same-origin and no CORS setup is
needed. Override the proxy target with `VITE_PROXY_TARGET` if the API is elsewhere.

Seeded demo identities (from the backend handover):

| Hospital | Email | Password |
|---|---|---|
| Acme | `admin@acme.example` | `Password123!` |
| Beta | `admin@beta.example` | `Password123!` |

`npm run build` typechecks and produces a production bundle in `dist/`.

## Environment

```bash
# Optional: talk to an API on another origin instead of the dev proxy.
# VITE_API_BASE_URL=https://api.example.com/api/v1
# VITE_PROXY_TARGET=http://127.0.0.1:8000
```

## What is implemented

- **Design foundation** — light/dark/system themes persisted in `localStorage`, tokens, typography,
  skeletons, reduced-motion support, responsive shell (264px sidebar → 76px rail → mobile tabs).
- **Auth** — cookie-based login with credentials included, access token kept in memory only,
  silent refresh-and-retry once on `401`, `GET /auth/me` session bootstrap, intended-URL redirect.
- **Permissions** — `usePermission`, `<Can>` (hide) and `GatedButton` (disabled with an explanation).
- **Dashboard** — greeting, tenant context, roles/permissions, recent registrations, shortcuts.
- **Patients** — cursor-paged directory with status filters, client-side search over loaded pages,
  density toggle, table/card responsive views, registration drawer, profile header, overview,
  visits, vitals and attachment tabs, privacy shield after inactivity.
- **Visits** — open/edit/close with `If-Match`; `412` opens the conflict dialog with
  *Reload latest / Review my changes / Cancel*. Notes autosave to `sessionStorage` while typing.
- **Vitals** — record against an open visit, handle the backend's `409 vitals_confirmation_required`
  warning flow, mark entered in error with a reason.
- **Images** — drag-and-drop upload with client-side type/size checks, progress and retry;
  responsive gallery, lightbox with keyboard navigation, and a one-shot presigned URL refresh on
  image load failure.

## Contract notes

These are deliberate decisions where the backend contract has no matching endpoint or field:

- There is no tenant-wide visits listing endpoint, so the shell has no global "Visits" page. Visits
  are reached through a patient. The visit detail page is at `/visits/:id`.
- There is no patient search parameter on `GET /patients`, so the directory filters the pages that
  have been loaded and says so; cursor "Load more" widens the search.
- `GET /tenant/config` requires `tenant:configure`, so visit-type suggestions only appear for users
  with that permission. Everyone else gets a free-text visit type.
- Attachments are visit-scoped. The patient "Attachments" tab picks a visit and shows its gallery.
- Attachment uploads return `503` until object storage is configured on the backend; the UI shows the
  API message instead of failing silently.
- `sex`, `date_of_birth` and `legacy_number` are read-only when editing, because `PatientUpdate` does
  not accept them.
