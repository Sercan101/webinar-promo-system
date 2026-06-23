import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://webinar-promo-system.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Webinar-Promo-System · Scaling Champions",
    template: "%s · Webinar-Promo-System",
  },
  description: "Webinar rein → Angles, markenkonforme Anzeigen (3 Formate), E-Mail-Einladung, Qualitäts-Check & Posting-Plan raus. Ein wiederverwendbares System.",
  applicationName: "Webinar-Promo-System",
  authors: [{ name: "Sercan Bahceci" }],
  keywords: ["Webinar", "Promo", "Ad Creatives", "Brand", "Gemini", "Marketing-Automation"],
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_URL,
    siteName: "Webinar-Promo-System",
    title: "Webinar-Promo-System",
    description: "Webinar rein → fertige Promo-Assets raus. Angles, Anzeigen, E-Mail, Qualitäts-Check & Posting-Plan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Webinar-Promo-System",
    description: "Webinar rein → fertige Promo-Assets raus.",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
