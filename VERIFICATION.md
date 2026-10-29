# Verification record — guest demo update

## Checks completed

- Python source compiles (`python -m compileall backend/app`).
- The guest catalog ranking smoke test passed for both audience settings: the Men result contains only Men/Unisex entries, and the Women result contains only Women/Unisex entries.
- The guest API returns the processed photo as a temporary data URL and does not persist it to Supabase.
- A regression test blocks a catalog row labelled as a saree from appearing in Men results even if its database gender is mislabeled.
- The existing Anywear widget script remains in `app/layout.tsx`; it is configured for `localhost:8081`.
- The ZIP omits private `.env` files, dependency folders, generated caches, and build output. Keep your existing `backend/.env` in your local folder.

## Not verified here

- The complete pytest suite was rerun after the edits: 30 tests passed.
- A fresh npm install timed out because package downloads were unavailable in this environment. Therefore a full TypeScript check and Next.js production build could not be run here.
- The embedded Anywear panel still depends on internet access, camera permission, vendor-side availability and eligibility of the local domain. A direct link to Anywear’s official live try-on page is included as fallback; the external camera flow still requires browser testing.
- Real photo analysis and weather requests depend on the models and credentials already configured on the user's computer.
- The old 2D overlay component remains in source but is not displayed or labelled as live try-on.

## Demo behavior

Guest styling edits bypass email sign-in for a local-only setup. The guest endpoint does not upload photos or save sessions to Supabase. Guest results exist only in the current browser page. The local guest endpoint is disabled automatically when a non-loopback origin is added to `ALLOWED_ORIGINS`.

- Complete-look section restored: three styling ideas with Myntra search links for tops, bottoms, shoes and accessories.
- Product card buttons now open Anywear live try-on rather than scrolling to the old 2D overlay.
