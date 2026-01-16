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
                    free: "#22c55e",
                    occupied: "#ef4444",
                    bill: "#eab308",
                },
                // KDS timer colors
                timer: {
                    normal: "#3b82f6",
                    warning: "#f59e0b",
                    critical: "#ef4444",
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
                "slide-up": "slideUp 0.4s ease-out",
                "slide-down": "slideDown 0.4s ease-out",
                "fade-in": "fadeIn 0.3s ease-out",
                "scale-in": "scaleIn 0.3s ease-out",
                "float": "float 6s ease-in-out infinite",
                "float-delayed": "floatDelayed 5s ease-in-out infinite 1s",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
                "shimmer": "shimmer 2s infinite",
                "gradient-shift": "gradientShift 4s ease infinite",
                "bounce-soft": "bounceSoft 2s ease-in-out infinite",
                "rotate-slow": "rotateSlow 20s linear infinite",
                "glow-pulse": "glowPulse 2s ease-in-out infinite",
                "border-glow": "borderGlow 2s ease-in-out infinite",
                "ripple": "ripple 0.6s linear",
                "shimmer-slide": "shimmerSlide 1.5s infinite",
                "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
                "pop": "pop 0.3s ease-out",
                "slide-in-left": "slideInLeft 0.3s ease-out",
            },
            keyframes: {
                slideIn: {
                    "0%": { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                slideDown: {
                    "0%": { transform: "translateY(-20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                scaleIn: {
                    "0%": { transform: "scale(0.9)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                    "50%": { transform: "translateY(-20px) rotate(2deg)" },
                },
                floatDelayed: {
                    "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                    "50%": { transform: "translateY(-15px) rotate(-2deg)" },
                },
                pulseGlow: {
                    "0%, 100%": {
                        boxShadow: "0 0 20px rgba(217, 45, 32, 0.3)",
                        transform: "scale(1)",
                    },
                    "50%": {
                        boxShadow: "0 0 40px rgba(217, 45, 32, 0.6)",
                        transform: "scale(1.02)",
                    },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                gradientShift: {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
                bounceSoft: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                rotateSlow: {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                glowPulse: {
                    "0%, 100%": {
                        filter: "drop-shadow(0 0 10px currentColor)",
                        opacity: "1",
                    },
                    "50%": {
                        filter: "drop-shadow(0 0 25px currentColor)",
                        opacity: "0.8",
                    },
                },
                borderGlow: {
                    "0%, 100%": {
                        borderColor: "rgba(217, 45, 32, 0.5)",
                        boxShadow: "0 0 15px rgba(217, 45, 32, 0.3)",
                    },
                    "50%": {
                        borderColor: "rgba(217, 45, 32, 1)",
                        boxShadow: "0 0 30px rgba(217, 45, 32, 0.6)",
                    },
                },
                ripple: {
                    "0%": { transform: "scale(1)", opacity: "1" },
                    "100%": { transform: "scale(1.5)", opacity: "0" },
                },
                shimmerSlide: {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" },
                },
                pulseSubtle: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                pop: {
                    "0%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.3)" },
                    "100%": { transform: "scale(1)" },
                },
                slideInLeft: {
                    "0%": { transform: "translateX(-100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
            },
            boxShadow: {
                'glow-brand': '0 0 30px rgba(217, 45, 32, 0.4)',
                'glow-blue': '0 0 30px rgba(59, 130, 246, 0.4)',
                'glow-green': '0 0 30px rgba(34, 197, 94, 0.4)',
                'glow-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
                'premium': '0 20px 50px -15px rgba(0, 0, 0, 0.15)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            transitionTimingFunction: {
                'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
