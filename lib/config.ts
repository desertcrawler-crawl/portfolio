// Text shown at the top of every page. Change it here or set SITE_TITLE in Vercel.
export const SITE_TITLE = process.env.SITE_TITLE || "SELLEBRATEN";

// Where projects and images are kept:
//  - "static": read-only, from content/projects.json + public/content (GitHub Pages preview)
//  - "github": the same files, and the admin saves changes as commits to the GitHub repo
//              (the live site on Vercel; needs GITHUB_TOKEN)
//  - "local":  the .data folder, edited through /admin (working on your own computer)
export const STORAGE: "static" | "github" | "local" =
  process.env.STATIC_EXPORT === "1" ? "static" : process.env.GITHUB_TOKEN ? "github" : "local";

// Set when the site lives in a sub-folder, e.g. desertcrawler-crawl.github.io/portfolio
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Footer on the front page opens an email to this address.
export const CONTACT_EMAIL = "selle@me.com";
export const CONTACT_SUBJECT = "Hej Niclas";
