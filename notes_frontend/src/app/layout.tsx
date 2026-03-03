import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notemaster",
  description:
    "Retro-themed notes app with auth, search, tags, and a fast editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
