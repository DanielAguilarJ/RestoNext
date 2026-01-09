import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Onboarding Gate
 * 
 * Redirects authenticated users with incomplete onboarding to /onboarding.
 * Note: This is a basic gate. The actual tenant data check happens client-side
 * since we're using Appwrite for auth (not cookies directly accessible in middleware).
 * 
 * For a more robust solution, consider using Appwrite's SSR auth patterns.
 */

// Routes that don't require onboarding check
const PUBLIC_ROUTES = [
    "/login",
    "/onboarding",
    "/menu",  // Customer-facing menu
    "/_next",
    "/api",
    "/favicon.ico",
    "/manifest.json",
];

// Routes that require completed onboarding
const PROTECTED_ROUTES = [
    "/pos",
    "/kitchen",
    "/kds",
    "/cashier",
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip public routes
    for (const route of PUBLIC_ROUTES) {
        if (pathname.startsWith(route)) {
            return NextResponse.next();
        }
    }

    // For protected routes, we'll let the client-side TenantProvider handle the redirect
    // since Appwrite auth state isn't directly available in Next.js middleware
    // This middleware can be enhanced with SSR auth patterns if needed

    // Allow the request to proceed - client-side will handle auth/onboarding checks
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
