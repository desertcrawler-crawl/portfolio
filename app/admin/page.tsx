import type { Metadata } from "next";
import { isAdmin, passwordConfigured } from "@/lib/auth";
import { STORAGE } from "@/lib/config";
import { getProjects } from "@/lib/store";
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
  return <AdminApp initial={await getProjects()} storage={STORAGE === "blob" ? "blob" : "local"} />;
}
