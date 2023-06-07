import localFont from "@next/font/local";

export const Inter = localFont({
  src: [
    {
      path: "./InterVariable.woff2",
      style: "normal",
    },
    {
      path: "./InterVariable-Italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  adjustFontFallback: false,
});

export const SourceHanSans = localFont({
  src: "./SourceHanSans-VF.otf.woff2",
  variable: "--font-source-han-sans",
  adjustFontFallback: false,
});
export const SourceHanSerif = localFont({
  src: "./SourceHanSerifJP-VF.ttf.woff2",
  variable: "--font-source-han-serif",
  adjustFontFallback: false,
});
export const SourceHanSansPunct = localFont({
  src: "./SourceHanSans-VF.otf.woff2",
  variable: "--font-source-han-sans-punct",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+3000-303F, U+FF00-FFEF, U+2013-2014, U+2026, U+2500, U+2E3A-2E3B",
    },
  ],
});
