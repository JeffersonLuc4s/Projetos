import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BackgroundLines from "@/components/BackgroundLines";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://jeffersonlucas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jefferson Lucas — Desenvolvedor Full Stack",
    template: "%s · Jefferson Lucas",
  },
  description:
    "Portfólio de Jefferson Lucas — Desenvolvedor Full Stack focado em interfaces modernas, performance e experiências digitais com acabamento.",
  keywords: [
    "Jefferson Lucas",
    "Desenvolvedor Full Stack",
    "Next.js",
    "React",
    "TypeScript",
    "Portfólio",
  ],
  authors: [{ name: "Jefferson Lucas" }],
  creator: "Jefferson Lucas",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    title: "Jefferson Lucas — Desenvolvedor Full Stack",
    description:
      "Portfólio pessoal com projetos, stack e contato de Jefferson Lucas.",
    siteName: "Jefferson Lucas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jefferson Lucas — Desenvolvedor Full Stack",
    description:
      "Portfólio pessoal com projetos, stack e contato de Jefferson Lucas.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="relative min-h-screen overflow-x-hidden">
        <div
          className="pointer-events-none fixed inset-0 grid-bg -z-10"
          aria-hidden="true"
        />
        <BackgroundLines />
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}