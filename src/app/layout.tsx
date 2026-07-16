import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SGI 4.0 — Sistema de Gestão Integrada",
  description: "Sistema de gestão integrada: VPC, campanhas e projeção de faturamento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${syne.variable} ${manrope.variable} ${jetbrains.variable} antialiased`}>
        <a href="#conteudo-principal" className="skip-link">
          Ir para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
