import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { SITE_TITLE } from "@/lib/config";
import ZoomOverlay from "@/components/ZoomOverlay";
import "./globals.css";

const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: `${SITE_TITLE} graphic design portfolio`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body>
        <header className="site-header">
          <Link href="/" className="site-title">
            {SITE_TITLE}
          </Link>
        </header>
        {children}
        <ZoomOverlay />
      </body>
    </html>
  );
}
