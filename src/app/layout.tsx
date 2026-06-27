import type { Metadata } from "next";
import { Share_Tech_Mono, VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
});

export const metadata: Metadata = {
  title: "TORN LIFE",
  description: "What kind of person is your Torn character becoming?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${shareTechMono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
