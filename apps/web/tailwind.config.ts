import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Brand colors
                brand: {
                    50: "#fef3f2",
                    100: "#fee4e2",
                    200: "#fecdca",
                    300: "#fba7a1",
                    400: "#f67970",
                    500: "#ec4a3f",
                    600: "#d92d20",
                    700: "#b72318",
                    800: "#981b16",
                    900: "#7d1d18",
                },
                // Status colors for tables
                table: {
                    free: "#22c55e",       // Green
                    occupied: "#ef4444",  // Red
                    bill: "#eab308",      // Yellow
                },
                // KDS timer colors
                timer: {
                    normal: "#3b82f6",    // Blue
                    warning: "#f59e0b",   // Amber
                    critical: "#ef4444",  // Red
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            // Mobile-first touch targets
            minHeight: {
                touch: "48px",
            },
            minWidth: {
                touch: "48px",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "slide-in": "slideIn 0.3s ease-out",
            },
            keyframes: {
                slideIn: {
                    "0%": { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
