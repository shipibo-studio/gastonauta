import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { instrumentSerif, sourceSans } from "@/app/fonts";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";



export const metadata: Metadata = {
  title: "Gastonauta",
  description: "Mapeando mi galaxia financiera",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${instrumentSerif.variable} ${sourceSans.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
