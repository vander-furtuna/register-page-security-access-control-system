import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

export const sora = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-sora" });
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});
