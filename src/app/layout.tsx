import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cal-os",
  description: "Calvin's personal life OS",
  icons: { apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#2e2620",
  width: "device-width",
  initialScale: 1,
};

// Fonts load from Google Fonts at runtime (a <link>), not at build time,
// so builds don't depend on reaching fonts.googleapis.com.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600&family=Oswald:wght@400;500;600&family=Yellowtail&family=Zilla+Slab:wght@600;700&display=swap";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
