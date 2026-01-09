import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RxDBProvider } from "../lib/db-provider";
import { TenantProvider } from "../lib/tenant-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RestoNext MX",
    description: "Cloud-Native Restaurant Management SaaS for Mexico",
    manifest: "/manifest.json",
    themeColor: "#d92d20",
    viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={inter.className}>
                <RxDBProvider>
                    <TenantProvider>
                        {children}
                    </TenantProvider>
                </RxDBProvider>
            </body>
        </html>
    );
}

