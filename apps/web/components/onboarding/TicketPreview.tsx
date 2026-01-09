"use client";

import React from "react";

interface TicketPreviewProps {
    tradeName: string;
    logoUrl?: string | null;
    showLogo?: boolean;
    address?: {
        street?: string;
        exterior_number?: string;
        interior_number?: string | null;
        neighborhood?: string;
        city?: string;
        state?: string;
        postal_code?: string;
    };
    footerLines?: string[];
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
}

export function TicketPreview({
    tradeName,
    logoUrl,
    showLogo = true,
    address,
    footerLines = [],
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
}: TicketPreviewProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount);
    };

    const buildAddressLine = () => {
        if (!address) return null;
        const parts = [];
        if (address.street) {
            parts.push(`${address.street} ${address.exterior_number || ""}`);
        }
        if (address.neighborhood) {
            parts.push(address.neighborhood);
        }
        const cityState = [address.city, address.state].filter(Boolean).join(", ");
        if (cityState) {
            parts.push(cityState);
        }
        if (address.postal_code) {
            parts.push(`C.P. ${address.postal_code}`);
        }
        return parts.join(", ");
    };

    return (
        <div className="bg-white text-black rounded-lg p-4 font-mono text-sm max-w-xs mx-auto shadow-xl border border-gray-200">
            {/* Header: Logo */}
            {showLogo && logoUrl && (
                <div className="flex justify-center mb-3">
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-14 object-contain"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                </div>
            )}

            {/* Trade Name */}
            <div className="text-center font-bold text-lg mb-1">
                {tradeName || "Nombre del Restaurante"}
            </div>

            {/* Address */}
            {address && (
                <div className="text-center text-xs text-gray-600 mb-2 leading-tight">
                    {buildAddressLine()}
                </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            {items.length > 0 ? (
                <div className="space-y-1">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                            <span>
                                {item.quantity}x {item.name}
                            </span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 text-xs py-2">
                    [Items de la orden]
                </div>
            )}

            {/* Totals */}
            {(subtotal > 0 || total > 0) && (
                <>
                    <div className="border-t border-dashed border-gray-400 my-2" />
                    <div className="space-y-1 text-xs">
                        {subtotal > 0 && (
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                        )}
                        {tax > 0 && (
                            <div className="flex justify-between">
                                <span>IVA (16%):</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                        )}
                        {total > 0 && (
                            <div className="flex justify-between font-bold text-sm">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Footer */}
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="text-center text-xs text-gray-600">
                {footerLines.length > 0 ? (
                    footerLines.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))
                ) : (
                    <div>¡Gracias por su preferencia!</div>
                )}
            </div>

            {/* Timestamp */}
            <div className="text-center text-xs text-gray-400 mt-2">
                {new Date().toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                })}
            </div>
        </div>
    );
}

export default TicketPreview;
