"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Receipt,
    Search,
    CreditCard,
    CheckCircle2,
    Download,
    AlertCircle,
    ArrowRight,
    FileText,
    Building2
} from "lucide-react";
import { billingApi, InvoiceResponse } from "@/lib/api";

export default function BillingPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Order Search
    const [orderId, setOrderId] = useState("");

    // Step 2: Fiscal Data
    const [fiscalData, setFiscalData] = useState({
        rfc: "",
        nombre: "",
        cp: "",
        uso_cfdi: "G03"
    });

    // Step 3: Result
    const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);

    const handleSearchOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validate UUID format roughly
            if (orderId.length < 10) {
                throw new Error("El ID del ticket parece inválido.");
            }

            // Check if invoice already exists
            const existingInvoices = await billingApi.getOrderInvoices(orderId);
            if (existingInvoices.length > 0) {
                setInvoice(existingInvoices[0]);
                setStep(3);
            } else {
                // If not, proceed to form
                setStep(2);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "No se encontró la orden o hubo un error.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await billingApi.createSelfInvoice({
                order_id: orderId,
                receptor_rfc: fiscalData.rfc.toUpperCase(),
                receptor_nombre: fiscalData.nombre.toUpperCase(),
                receptor_cp: fiscalData.cp,
                uso_cfdi: fiscalData.uso_cfdi
            });
            setInvoice(result);
            setStep(3);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al generar la factura. Verifique sus datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-purple-500/30">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 shadow-2xl mb-6">
                        <Receipt className="w-10 h-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        RestoNext Facturación
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Genera tu factura fiscal en segundos
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mb-8 relative">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-800 -z-10" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>1</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>2</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-500'}`}>3</div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Step 1: Search */}
                    {step === 1 && (
                        <form onSubmit={handleSearchOrder} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">ID del Ticket</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        value={orderId}
                                        onChange={(e) => setOrderId(e.target.value)}
                                        placeholder="Ingrese el ID de su orden"
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    El ID se encuentra en la parte inferior de su ticket impreso.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                                ) : (
                                    <>
                                        Buscar Ticket <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Fiscal Data */}
                    {step === 2 && (
                        <form onSubmit={handleGenerateInvoice} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">RFC</label>
                                <input
                                    type="text"
                                    value={fiscalData.rfc}
                                    onChange={(e) => setFiscalData({ ...fiscalData, rfc: e.target.value })}
                                    className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none uppercase"
                                    placeholder="XAXX010101000"
                                    required
                                    maxLength={13}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Razón Social</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={fiscalData.nombre}
                                        onChange={(e) => setFiscalData({ ...fiscalData, nombre: e.target.value })}
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500/50 outline-none uppercase"
                                        placeholder="Nombre o Empresa"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Código Postal</label>
                                    <input
                                        type="text"
                                        value={fiscalData.cp}
                                        onChange={(e) => setFiscalData({ ...fiscalData, cp: e.target.value })}
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        placeholder="00000"
                                        required
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Uso CFDI</label>
                                    <select
                                        value={fiscalData.uso_cfdi}
                                        onChange={(e) => setFiscalData({ ...fiscalData, uso_cfdi: e.target.value })}
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none"
                                    >
                                        <option value="G03">G03 - Gastos en general</option>
                                        <option value="G01">G01 - Adquisición de mercancías</option>
                                        <option value="P01">P01 - Por definir</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" /> Generar Factura
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-white transition-colors"
                                >
                                    Volver
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && invoice && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-green-500/50">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">¡Factura Generada!</h2>
                            <p className="text-gray-400 mb-8">
                                La factura ha sido enviada al SAT correctamente.
                            </p>

                            <div className="space-y-3 mb-8">
                                <a
                                    href={invoice.xml_url || "#"}
                                    target="_blank"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-200">Archivo XML</div>
                                            <div className="text-xs text-gray-500">Comprobante fiscal digital</div>
                                        </div>
                                    </div>
                                    <Download className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                                </a>

                                <a
                                    href={invoice.pdf_url || "#"}
                                    target="_blank"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-200">Archivo PDF</div>
                                            <div className="text-xs text-gray-500">Representación impresa</div>
                                        </div>
                                    </div>
                                    <Download className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                                </a>
                            </div>

                            <button
                                onClick={() => {
                                    setStep(1);
                                    setOrderId("");
                                    setInvoice(null);
                                }}
                                className="text-gray-500 hover:text-white transition-colors text-sm"
                            >
                                Facturar otro ticket
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
