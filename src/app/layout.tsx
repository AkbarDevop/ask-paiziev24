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
  metadataBase: new URL("https://askpaiziev24.netlify.app"),
  openGraph: {
    title: "Ask Akmal — AI Clone of Akmal Paiziev",
    description:
      "Chat with an AI trained on Akmal Paiziev's interviews, articles, and public writings. Founder of Express24, MyTaxi & Numeo.ai.",
    type: "website",
    url: "https://askpaiziev24.netlify.app",
    siteName: "Ask Akmal",
    images: [
      {
        url: "/akmal.jpg",
        width: 400,
        height: 400,
        alt: "Akmal Paiziev",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Ask Akmal — AI Clone of Akmal Paiziev",
    description:
      "Chat with an AI trained on Akmal Paiziev's interviews, articles, and public writings.",
    images: ["/akmal.jpg"],
  },
  icons: {
    icon: "/akmal.jpg",
    apple: "/akmal.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
