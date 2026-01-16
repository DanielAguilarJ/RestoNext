import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RxDBProvider } from "../lib/db-provider";
import { TenantProvider } from "../lib/tenant-provider";
import AppShell from "@/components/layout/AppShell";

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
                        <AppShell>
                            {children}
                        </AppShell>
                    </TenantProvider>
                </RxDBProvider>
            </body>
        </html>
    );
}

