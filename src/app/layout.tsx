import type { Metadata } from "next";
import { headers } from "next/headers";
import "../styles/globals.css";
import { Providers } from "./providers";
import GlobalBackground from "../components/GlobalBackground";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PortalChrome from "../components/layout/PortalChrome";
import { resolveAppSurface } from "@/lib/app-surface";

export const metadata: Metadata = {
  title: "Off2Zim - Explore | Experience | Enjoy",
  description:
    "Explore, experience, and enjoy Zimbabwe with Off2Zim. Find trusted stays, activities, transport, and local travel help in one place.",
  keywords:
    "Zimbabwe, travel, tourism, hotels, activities, dining, events, Victoria Falls, safari, adventure",
  authors: [{ name: "Off2Zim Team" }],
  creator: "Off2Zim",
  publisher: "Off2Zim",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://off2zim.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Off2Zim - Explore | Experience | Enjoy",
    description:
      "Explore, experience, and enjoy Zimbabwe with trusted stays, activities, transport, and local travel help.",
    url: "https://off2zim.com",
    siteName: "Off2Zim",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Off2Zim - Zimbabwe Travel Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Off2Zim - Explore | Experience | Enjoy",
    description:
      "Explore, experience, and enjoy Zimbabwe with trusted stays, activities, transport, and local travel help.",
    images: ["/images/og-image.jpg"],
    creator: "@off2zim",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const surfaceHeader = headerStore.get("x-off2zim-surface");
  const isAuthScreen = headerStore.get("x-off2zim-auth-screen") === "true";
  const surface = surfaceHeader
    ? resolveAppSurface(surfaceHeader)
    : resolveAppSurface(host);
  const isPublicSurface = surface === "public";
  const showPortalChrome =
    !isAuthScreen && surface !== "public" && surface !== "admin";
  const showPublicChrome = !isAuthScreen && isPublicSurface;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/favicon.png" />
        <link
          rel="preload"
          href="/fonts/centurygothic.ttf"
          as="font"
          type="font/ttf"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/centurygothic_bold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin=""
        />
      </head>
      <body className="font-century-gothic antialiased">
        <GlobalBackground />
        <Providers>
          {showPublicChrome ? <Header /> : null}
          {showPortalChrome ? <PortalChrome surface={surface} /> : null}
          <main className="min-h-screen">{children}</main>
          {showPublicChrome ? <Footer /> : null}
        </Providers>
      </body>
    </html>
  );
}
