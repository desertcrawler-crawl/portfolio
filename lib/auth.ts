import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "admin_session";

function token(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(`portfolio-admin:${pw}`).digest("hex");
}

export function checkPassword(input: string): string | null {
  const t = token();
  if (!t) return null;
  const given = createHash("sha256").update(`portfolio-admin:${input}`).digest("hex");
  return timingSafeEqual(Buffer.from(t), Buffer.from(given)) ? t : null;
}

export async function isAdmin(): Promise<boolean> {
  const t = token();
  if (!t) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c || c.length !== t.length) return false;
  return timingSafeEqual(Buffer.from(c), Buffer.from(t));
}

export function passwordConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}
