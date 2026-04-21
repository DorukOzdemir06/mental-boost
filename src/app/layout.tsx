import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, Cinzel, VT323, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const vt323 = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });
const pressStart2P = Press_Start_2P({ variable: "--font-press-start", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mental Boost | KPSS Hız & Zihin Antrenmanı",
  description:
    "KPSS Genel Yetenek için mental kapasite ve hız artırma uygulaması. Zayıf konuları tespit et, oyunlaştırılmış antrenmanlarla güçlen!",
};

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeEffects } from "@/components/theme-effects";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${cinzel.variable} ${vt323.variable} ${pressStart2P.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative z-0">
        <ThemeProvider>
          <ThemeEffects />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
