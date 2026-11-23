import type { Metadata } from "next";
import { isAdmin, passwordConfigured } from "@/lib/auth";
import { STORAGE } from "@/lib/config";
import { getProjectsForAdmin } from "@/lib/store";
import { GITHUB_BRANCH, GITHUB_REPO } from "@/lib/github";
import AdminApp from "./AdminApp";
import Login from "./Login";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!passwordConfigured()) {
    return (
      <main className="admin narrow">
        <p>
          The admin page is switched off. Add a setting called <b>ADMIN_PASSWORD</b> (in Vercel: Project → Settings →
          Environment Variables) and redeploy.
        </p>
      </main>
    );
  }
  if (!(await isAdmin())) return <Login />;
    // On Vercel, images saved a moment ago aren't part of the published site yet, so the
  // admin shows them straight from GitHub.
  const rawBase =
    STORAGE === "github" ? `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/public` : null;
  return <AdminApp initial={await getProjectsForAdmin()} rawBase={rawBase} />;
}
