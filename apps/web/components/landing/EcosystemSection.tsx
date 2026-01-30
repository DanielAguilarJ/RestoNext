"use client";

import { memo, useMemo } from "react";
import { m, type Variants } from "framer-motion";
import {
    Monitor,
    Smartphone,
    Tablet,
    Server,
    ArrowLeftRight,
    Database,
    Cloud,
    type LucideIcon,
} from "lucide-react";

// ============================================
// Types
// ============================================
interface EcosystemNode {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly colorClass: string;
    readonly bgClass: string;
    readonly borderClass: string;
}

// ============================================
// Constants
// ============================================
const ECOSYSTEM_NODES: readonly EcosystemNode[] = [
    { icon: Monitor, title: "Admin Panel", colorClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/30" },
    { icon: Smartphone, title: "Pedidos QR", colorClass: "text-purple-400", bgClass: "bg-purple-500/10", borderClass: "border-purple-500/30" },
    { icon: Tablet, title: "POS", colorClass: "text-green-400", bgClass: "bg-green-500/10", borderClass: "border-green-500/30" },
    { icon: Database, title: "Inventario", colorClass: "text-orange-400", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/30" },
    { icon: Server, title: "Cocina (KDS)", colorClass: "text-red-400", bgClass: "bg-red-500/10", borderClass: "border-red-500/30" },
    { icon: ArrowLeftRight, title: "Facturación", colorClass: "text-cyan-400", bgClass: "bg-cyan-500/10", borderClass: "border-cyan-500/30" },
] as const;

const NODE_RADIUS_DESKTOP = 220;
const NODE_RADIUS_MOBILE = 140;
const DEGREES_PER_NODE = 360 / ECOSYSTEM_NODES.length;

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.5 },
    },
};

const nodeVariants: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { opacity: 1, scale: 1 },
};

const centralNodeVariants: Variants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
};

const lineVariants: Variants = {
    hidden: { opacity: 0, scaleX: 0 },
    visible: (i: number) => ({
        opacity: 1,
        scaleX: 1,
        transition: { delay: 0.3 + i * 0.08, duration: 0.6 },
    }),
};

// ============================================
// Helper: Calculate position on a circle
// ============================================
function getCircularPosition(index: number, total: number, radius: number): { x: number; y: number } {
    const angleInDegrees = index * (360 / total) - 90; // Start from top (-90 degrees)
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    return {
        x: Math.cos(angleInRadians) * radius,
        y: Math.sin(angleInRadians) * radius,
    };
}

// ============================================
// Subcomponents
// ============================================
interface NodeCardProps {
    readonly node: EcosystemNode;
    readonly index: number;
}

const NodeCard = memo(function NodeCard({ node, index }: NodeCardProps) {
    const Icon = node.icon;
    const posDesktop = getCircularPosition(index, ECOSYSTEM_NODES.length, NODE_RADIUS_DESKTOP);
    const posMobile = getCircularPosition(index, ECOSYSTEM_NODES.length, NODE_RADIUS_MOBILE);

    return (
        <m.div
            variants={nodeVariants}
            className={`absolute flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl ${node.bgClass} ${node.borderClass} border backdrop-blur-sm will-change-transform`}
            style={{
                // Use CSS custom properties for responsive radius
                ["--x-desktop" as string]: `${posDesktop.x}px`,
                ["--y-desktop" as string]: `${posDesktop.y}px`,
                ["--x-mobile" as string]: `${posMobile.x}px`,
                ["--y-mobile" as string]: `${posMobile.y}px`,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + var(--x-mobile)), calc(-50% + var(--y-mobile)))`,
            }}
        // Override for larger screens handled via Tailwind
        >
            <Icon className={`w-6 h-6 md:w-8 md:h-8 ${node.colorClass}`} aria-hidden="true" />
            <span className="text-xs md:text-sm text-zinc-200 font-medium whitespace-nowrap">
                {node.title}
            </span>
        </m.div>
    );
});

const ConnectingLine = memo(function ConnectingLine({ index, degrees }: { index: number; degrees: number }) {
    return (
        <m.div
            custom={index}
            variants={lineVariants}
            className="absolute top-1/2 left-1/2 h-[2px] w-[100px] md:w-[180px] bg-gradient-to-r from-brand-500 to-transparent origin-left -z-10 will-change-transform"
            style={{ transform: `rotate(${degrees}deg)` }}
            aria-hidden="true"
        >
            <div className="absolute right-0 -top-1 w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
function EcosystemSection() {
    const nodeCards = useMemo(
        () => ECOSYSTEM_NODES.map((node, idx) => (
            <NodeCard key={node.title} node={node} index={idx} />
        )),
        []
    );

    const connectingLines = useMemo(
        () => ECOSYSTEM_NODES.map((_, idx) => (
            <ConnectingLine key={idx} index={idx} degrees={idx * DEGREES_PER_NODE} />
        )),
        []
    );

    return (
        <section
            id="ecosystem"
            aria-labelledby="ecosystem-heading"
            className="py-24 bg-zinc-900 border-y border-zinc-800 relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
                    <h2
                        id="ecosystem-heading"
                        className="text-3xl md:text-5xl font-bold text-white mb-6"
                    >
                        Todo conectado, <br />
                        <span className="text-zinc-400">en tiempo real</span>
                    </h2>
                    <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
                        Olvídate de sistemas aislados. En RestoNext, lo que vendes en el POS se
                        descuenta del inventario, se visualiza en cocina y se registra en
                        contabilidad instantáneamente.
                    </p>
                </div>

                {/* Ecosystem Diagram */}
                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="relative flex justify-center items-center h-[400px] md:h-[550px]"
                >
                    {/* Central Node */}
                    <m.div
                        variants={centralNodeVariants}
                        className="relative z-20 w-28 h-28 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 p-1 shadow-2xl shadow-brand-500/30 flex items-center justify-center"
                    >
                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                            {/* Subtle animated grid */}
                            <div
                                className="absolute inset-0 opacity-10 animate-[spin_60s_linear_infinite]"
                                style={{
                                    backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                                    backgroundSize: "12px 12px",
                                }}
                                aria-hidden="true"
                            />
                            <Cloud className="w-10 h-10 md:w-16 md:h-16 text-white" aria-hidden="true" />
                        </div>

                        {/* Connecting Lines */}
                        {connectingLines}
                    </m.div>

                    {/* Orbiting Nodes */}
                    <div
                        className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
                        role="list"
                        aria-label="Módulos del ecosistema"
                    >
                        {nodeCards}
                    </div>
                </m.div>
            </div>
        </section>
    );
}

export default memo(EcosystemSection);
