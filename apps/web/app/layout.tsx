import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RxDBProvider } from "../lib/db-provider";
import { TenantProvider } from "../lib/tenant-provider";
import { ReactQueryProvider } from "../lib/react-query-provider";
import AppShell from "@/components/layout/AppShell";
import { ActivityTracker } from "@/components/analytics/ActivityTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RestoNext MX",
    description: "Cloud-Native Restaurant Management SaaS for Mexico",
    manifest: "/manifest.json",
};

export const viewport: Viewport = {
    themeColor: "#d92d20",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
                        <ReactQueryProvider>
                            <ActivityTracker>
                                <AppShell>
                                    {children}
                                </AppShell>
                            </ActivityTracker>
                        </ReactQueryProvider>
                    </TenantProvider>
                </RxDBProvider>
            </body>
        </html>
    );
}
