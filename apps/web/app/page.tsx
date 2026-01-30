"use client";

import dynamic from "next/dynamic";
import { LazyMotion, domAnimation } from "framer-motion";

// Dynamic Imports with loading states
const HeroSection = dynamic(() => import("../components/landing/HeroSection"), {
    ssr: true, // Keep Server Side Rendering for Hero for SEO/LCP
});

const StatsSection = dynamic(() => import("../components/landing/StatsSection"), {
    loading: () => <div className="h-24 bg-zinc-950" />
});

const FeaturesSection = dynamic(() => import("../components/landing/FeaturesSection"), {
    loading: () => <div className="h-96 bg-zinc-950" />
});

const EcosystemSection = dynamic(() => import("../components/landing/EcosystemSection"), {
    loading: () => <div className="h-96 bg-zinc-900" />
});

const AiFeatureSection = dynamic(() => import("../components/landing/AiFeatureSection"), {
    loading: () => <div className="h-96 bg-zinc-950" />
});

const PricingSection = dynamic(() => import("../components/landing/PricingSection"), {
    loading: () => <div className="h-96 bg-zinc-950" />
});

const TestimonialsSection = dynamic(() => import("../components/landing/TestimonialsSection"), {
    loading: () => <div className="h-96 bg-zinc-950" />
});

const CtaSection = dynamic(() => import("../components/landing/CtaSection"), {
    loading: () => <div className="h-48 bg-zinc-950" />
});

export default function Home() {
    return (
        <LazyMotion features={domAnimation}>
            <main>
                <HeroSection />
                <StatsSection />
                <FeaturesSection />
                <EcosystemSection />
                <AiFeatureSection />
                <TestimonialsSection />
                <PricingSection />
                <CtaSection />
            </main>
        </LazyMotion>
    );
}
