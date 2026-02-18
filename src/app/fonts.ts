import { Instrument_Serif, Source_Sans_3 } from "next/font/google";

// Instrument Serif solo soporta 400 (regular y italic)
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Source Sans 3 soporta 200-900
export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-sans-3",
  display: "swap",
});
