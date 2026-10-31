import type { Metadata } from "next";
import { Archivo, Geist } from "next/font/google";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Linkbase — One link for everything you share",
  description:
    "Put your socials, portfolio, videos, shop and website on one page, then share a single Linkbase URL wherever your audience finds you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">{children}</body>
    </html>
  );
}
