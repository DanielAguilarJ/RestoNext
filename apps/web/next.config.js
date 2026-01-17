/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode for development
    reactStrictMode: true,

    // Standalone build for Docker
    output: 'standalone',

    // Environment variables accessible on client
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
    },

    // Image optimization
    images: {
        domains: ["localhost"],
    },

    // Transpile RxDB to handle ESM modules correctly
    transpilePackages: ["rxdb"],
};

module.exports = nextConfig;
