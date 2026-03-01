import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ask Akmal — Talk to Akmal Paiziev's AI Clone",
  description:
    "Chat with an AI version of Akmal Paiziev, serial entrepreneur and founder of Express24, MyTaxi, and Numeo.ai. Ask about startups, Uzbekistan's tech scene, and building companies.",
  openGraph: {
    title: "Ask Akmal — AI Clone of Akmal Paiziev",
    description:
      "Chat with an AI trained on Akmal Paiziev's interviews, articles, and public writings.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
