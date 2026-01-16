/**
 * Dining Layout - Consumer-Facing Layout
 * 
 * This layout is separate from the admin dashboard layout.
 * It's designed for customers using tablets at tables.
 * 
 * Features:
 * - Mobile-first responsive design
 * - No sidebar or admin navigation
 * - Simple, clean UI focused on ordering
 * - Floating cart button
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Ordenar | RestoNext",
    description: "Ordena directamente desde tu mesa",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#ffffff",
};

export default function DiningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={`${inter.className} bg-gray-50 min-h-screen`}>
                {children}
            </body>
        </html>
    );
}
