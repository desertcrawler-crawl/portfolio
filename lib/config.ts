// Text shown at the top of every page. Change it here or set SITE_TITLE in Vercel.
export const SITE_TITLE = process.env.SITE_TITLE || "SELLEBRATEN";

// Where projects and images are kept:
//  - "static": read-only, from content/projects.json + public/content (GitHub Pages preview)
//  - "blob":   Vercel Blob storage, edited through /admin (the live site on Vercel)
//  - "local":  the .data folder, edited through /admin (working on your own computer)
export const STORAGE: "static" | "blob" | "local" =
  process.env.STATIC_EXPORT === "1" ? "static" : process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";

// Set when the site lives in a sub-folder, e.g. desertcrawler-crawl.github.io/portfolio
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Footer on the front page opens an email to this address.
export const CONTACT_EMAIL = "selle@me.com";
export const CONTACT_SUBJECT = "Hej Niclas";
