import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RestoNext - El Sistema POS Más Potente para Restaurantes en México",
    description:
        "Transforma tu restaurante con RestoNext: POS inteligente, facturación fiscal, inventario automatizado, KDS y más. Prueba GRATIS durante 14 días.",
    keywords: [
        "POS restaurantes",
        "punto de venta México",
        "sistema restaurantes",
        "facturación electrónica restaurantes",
        "CFDI 4.0 restaurantes",
        "inventario restaurantes",
        "KDS cocina display",
    ],
    openGraph: {
        title: "RestoNext - Sistema POS para Restaurantes",
        description:
            "El sistema de punto de venta más completo para restaurantes en México. IA, Facturación Fiscal, Inventario y más.",
        type: "website",
        locale: "es_MX",
    },
    twitter: {
        card: "summary_large_image",
        title: "RestoNext - Sistema POS para Restaurantes",
        description:
            "Transforma tu restaurante con tecnología de punta. Prueba GRATIS.",
    },
};

export const viewport: Viewport = {
    themeColor: "#d92d20",
    width: "device-width",
    initialScale: 1,
};

export default function LandingLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es-MX" className="scroll-smooth">
            <body className={`${inter.className} antialiased`}>
                {children}
            </body>
        </html>
    );
}
