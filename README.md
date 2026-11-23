# Portfolio

A minimal portfolio: a grid of square images with a centred caption, and a page per project
with a carousel (arrows, swipe, dots), the project name and an "Information" link.

## Where things live

| What | Where |
| --- | --- |
| Front page grid | `app/page.tsx` |
| Project page | `app/p/[slug]/page.tsx`, `components/Carousel.tsx` |
| Look and feel (sizes, spacing, font) | `app/globals.css` |
| Font (IBM Plex Mono Regular + Medium) | `app/fonts/` |
| Site title at the top | `lib/config.ts` or the `SITE_TITLE` setting |
| Upload / admin page | `app/admin/` (at `/admin`) |
| Preview projects (GitHub Pages) | `content/projects.json` + `public/content/` |

## Three ways it runs

1. **GitHub Pages preview** (now). Every push to `main` publishes a read-only copy built from
   `content/projects.json`. The admin page is not included, because GitHub Pages can't run server code.
2. **Vercel** (the live site later). Connect the repo in Vercel, add a Blob store
   (Storage → Blob, which sets `BLOB_READ_WRITE_TOKEN`) and a setting `ADMIN_PASSWORD`.
   Then go to `/admin`, log in and upload projects. Add `www.sellebraten.com` under Domains.
3. **On your own computer**: `npm install`, then `ADMIN_PASSWORD=something npm run dev`
   and open http://localhost:3000/admin. Projects are saved in the `.data` folder.

## Images

Square 1024×1024 images work best. 2 to 8 images per project; the first is shown on the front page.
