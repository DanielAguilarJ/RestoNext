/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode for development
    reactStrictMode: true,

    // Standalone build for Docker
    output: 'standalone',

    // Environment variables accessible on client
    // IMPORTANT: These fallbacks are only used if env vars are not set
    // In production, DigitalOcean sets these via the app spec
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://restonext.me/api",
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "wss://restonext.me/api",
    },


    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'restonext.me',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            }
        ],
        minimumCacheTTL: 60,
    },

    // Compiler options
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? {
            exclude: ["error", "warn"],
        } : false,
    },

    // Transpile RxDB to handle ESM modules correctly
    transpilePackages: ["rxdb"],
};

module.exports = nextConfig;
