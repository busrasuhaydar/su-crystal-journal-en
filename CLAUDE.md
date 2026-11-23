# Su's Magical Journal · Crystal Journal (English copy)

English-only copy of the Turkish crystal journal (`~/Desktop/Su Kristal Defter`). Same stack (React 18 + TypeScript + Vite, TanStack Query, Supabase project `tjouaydmwmokbuomyyub`), same crystal/WebGL theme in `src/crystal/`. Dev port **5175**.

## Differences from the original
- All UI text is English; dates use English month/weekday names; locale `en-US`/`en-GB`; time zone is still Europe/Istanbul.
- Routes are English: `/calendar/{year,month,week,agenda}`, `/day/:date`, `/tasks`, `/projects/:slug/{overview,tasks,gallery,pages,notes,timeline,social,opportunities,contacts}`, `/opportunities/:id`, `/contacts`, `/ideas`, `/collections/:slug`, `/gallery`, `/files`, `/settings`, `/social`.
- `public/collections.json` (was `koleksiyonlar.json`); collection projects still use the DB slug prefix `koleksiyon-<slug>` (existing data).
- `supabase/functions/*` are translated but not deployed; deployed functions (notification texts, AI extraction language) are still the original Turkish ones until deployed.
- No git repo / GitHub Actions workflow in this copy.
- Existing DB rows keep their Turkish values (task categories, project titles, etc.).

## Rules carried over
- Single-record principle, soft delete (`deleted_at`), RLS with `owner_id`, `memory_entries` append-only.
- Every button has an icon (lucide-react); no overlapping/fixed-position items; check 375px and desktop.
- New CSS goes at the END of `src/styles/crystal.css`; add new pages to `NAV` in `src/crystal/Nav.tsx`.
- Check = `npx tsc -p tsconfig.json`. Reply to the user briefly.
