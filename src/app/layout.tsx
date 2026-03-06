import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
  manifest: "/manifest.json",
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
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preload" href="/akmal.jpg" as="image" />
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K2CFJGHR');`}
        </Script>
        <script
          defer
          data-domain="askpaiziev24.netlify.app"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K2CFJGHR"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
