import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * RestoNext MX - Next.js Middleware
 * ================================
 * 
 * Handles:
 * 1. Public route access (landing, login, legal, etc.)
 * 2. Protected dashboard routes
 * 3. Module-based license verification (via cookies/headers)
 * 
 * For module license verification, we check a cookie that should be set
 * by the frontend after login (from the user's active_addons).
 * 
 * The actual permission data comes from the API and is stored client-side.
 * This middleware performs basic route protection; detailed permission checks
 * happen client-side in the TenantProvider.
 */

// ============================================
// Route Definitions
// ============================================

// Routes that are completely public (no auth needed)
const PUBLIC_ROUTES = [
    "/",                    // Landing page
    "/login",
    "/checkout",
    "/onboarding",          // Onboarding wizard (handles own auth via localStorage)
    "/legal",
    "/menu",                // Customer-facing QR menu
    "/portal",              // Customer portal (dining)
    "/dine",                // Self-service dining
    "/_next",
    "/api",
    "/favicon.ico",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
];

// Routes that require authentication but no specific module license
const AUTH_PROTECTED_ROUTES = [
    "/dashboard",
    "/settings",
    "/billing",
];

// Module routes and their required license keys
// These map to the tenant's active_addons in the database
const MODULE_ROUTES: Record<string, string[]> = {
    // Core modules (included in all plans)
    "/pos": [],             // POS - included in all
    "/kitchen": [],         // KDS - included in all
    "/kds": [],             // KDS alias
    "/cashier": [],         // Cashier - included in all
    "/analytics": [],       // Basic analytics - included in all

    // Premium modules (require specific licenses)
    "/inventory": ["inventory", "starter"],   // Inventory module
    "/catering": ["catering"],                // Catering module
    "/customers": ["loyalty"],                // Customer management
    "/promotions": ["promotions"],            // Promotions engine
    "/reservations": ["reservations"],        // Reservations system

    // Admin (requires admin/manager role)
    "/admin": ["admin_access"],

    // Enterprise features
    "/modules/ai-forecasting": ["analytics_ai"],
    "/modules/multi-branch": ["multi_branch"],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a path matches any of the given prefixes
 */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
    return prefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * Check if path requires a specific module license
 */
function getRequiredLicenses(pathname: string): string[] {
    for (const [route, licenses] of Object.entries(MODULE_ROUTES)) {
        if (pathname.startsWith(route)) {
            return licenses;
        }
    }
    return [];
}

/**
 * Get user's active licenses from cookie
 * Cookie format: comma-separated license keys
 * Example: "inventory,catering,analytics_ai"
 */
function getUserLicenses(request: NextRequest): string[] {
    const licenseCookie = request.cookies.get("restonext_licenses");
    if (!licenseCookie?.value) {
        return [];
    }
    return licenseCookie.value.split(",").map(l => l.trim());
}

/**
 * Check if user has auth token
 */
function isAuthenticated(request: NextRequest): boolean {
    // Check for JWT in cookie or Authorization header
    const authCookie = request.cookies.get("restonext_token");
    const authHeader = request.headers.get("Authorization");

    return !!(authCookie?.value || authHeader);
}

// ============================================
// Middleware Function
// ============================================

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip public routes
    if (matchesPrefix(pathname, PUBLIC_ROUTES)) {
        return NextResponse.next();
    }

    // 2. Check if user is authenticated
    const authenticated = isAuthenticated(request);

    if (!authenticated) {
        // Redirect to login with return URL
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Check module-specific licenses
    const requiredLicenses = getRequiredLicenses(pathname);

    if (requiredLicenses.length > 0) {
        const userLicenses = getUserLicenses(request);

        // Check if user has at least one of the required licenses
        const hasAccess = requiredLicenses.length === 0 ||
            requiredLicenses.some(license => userLicenses.includes(license));

        if (!hasAccess) {
            // Redirect to upgrade page
            const upgradeUrl = new URL("/settings/billing", request.url);
            upgradeUrl.searchParams.set("upgrade", requiredLicenses[0]);
            upgradeUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(upgradeUrl);
        }
    }

    // 4. Allow access
    return NextResponse.next();
}

// ============================================
// Matcher Configuration
// ============================================

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
