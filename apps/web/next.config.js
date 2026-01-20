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
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://whale-app-i6h36.ondigitalocean.app/api",
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "wss://whale-app-i6h36.ondigitalocean.app/api/ws",
    },


    // Image optimization
    images: {
        domains: ["localhost"],
    },

    // Transpile RxDB to handle ESM modules correctly
    transpilePackages: ["rxdb"],
};

module.exports = nextConfig;
