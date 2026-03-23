import type { Metadata } from "next";
import { DM_Sans, DM_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["300","400","500","600"] });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], variable: "--font-serif", weight: "400", style: ["normal","italic"] });

export const metadata: Metadata = {
  title: "Hemanth's Job Application Agent",
  description: "AI-powered resume tailoring and autofill for job applications",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} ${dmSerif.variable}`} style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
