import '@/app/globals.css';

export const metadata = {
    title: 'Portal de Propuestas | RestoNext',
    description: 'Portal de revisión y firma de propuestas de catering',
};

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout is intentionally minimal - no auth required
    // It serves as a public-facing portal for clients
    return (
        <html lang="es">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
