import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "SD Beauty Glam · Ongles Rennes",
  description: "Prothésiste ongulaire diplômée à Beauregard, Rennes. Gel, gainage, demi-capsules, nail art. Réservez en ligne.",
  openGraph: { title: "SD Beauty Glam", description: "Réservez votre pose d'ongles en ligne à Rennes.", images: ["/gallery/s2.jpg"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f8f4f0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&family=Pinyon+Script&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
