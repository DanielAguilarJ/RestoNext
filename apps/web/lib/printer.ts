import EscPosEncoder from 'esc-pos-encoder';
import { Order } from '../../../packages/shared/src/index';

// ============================================
// Printer Configuration Types
// ============================================

export type PrinterConfig =
    | { type: 'usb' }
    | { type: 'network'; ip: string; port: number };

// Default to USB for backward compatibility
let currentPrinterConfig: PrinterConfig = { type: 'usb' };

// ============================================
// USB Printer State
// ============================================

// Vendor IDs for common printers (Epson, Star, etc.)
const PRINTER_FILTERS = [
    { vendorId: 0x04b8 }, // Epson
    { vendorId: 0x0519 }, // Star Micronics
];

let hookedUsbPrinter: USBDevice | null = null;

// ============================================
// Configuration
// ============================================

/**
 * Set the printer configuration
 */
export const setPrinterConfig = (config: PrinterConfig): void => {
    currentPrinterConfig = config;
};

/**
 * Get current printer configuration
 */
export const getPrinterConfig = (): PrinterConfig => {
    return currentPrinterConfig;
};

// ============================================
// USB Printer Functions
// ============================================

/**
 * Connect to USB printer via WebUSB
 */
export const connectToUsbPrinter = async (): Promise<boolean> => {
    try {
        if (!navigator.usb) {
            console.error("WebUSB not supported in this browser");
            return false;
        }

        const device = await navigator.usb.requestDevice({
            filters: [] // Show all devices
        });

        if (device) {
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            await device.claimInterface(0);
            hookedUsbPrinter = device;
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to connect to USB printer", e);
        return false;
    }
};

/**
 * Send data to USB printer
 */
const sendToUsbPrinter = async (data: Uint8Array): Promise<void> => {
    if (!hookedUsbPrinter) {
        throw new Error("No USB printer connected");
    }

    const endpoint = hookedUsbPrinter.configuration?.interfaces[0].alternate.endpoints.find(
        e => e.direction === 'out'
    );

    if (!endpoint) {
        throw new Error("Could not find output endpoint on printer");
    }

    await hookedUsbPrinter.transferOut(endpoint.endpointNumber, data.buffer as ArrayBuffer);
};

// ============================================
// Network Printer Functions
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Send data to network printer via backend proxy
 */
const sendToNetworkPrinter = async (
    ip: string,
    port: number,
    data: Uint8Array
): Promise<void> => {
    // Convert Uint8Array to base64
    const base64Data = btoa(
        Array.from(data)
            .map(byte => String.fromCharCode(byte))
            .join('')
    );

    const token = localStorage.getItem('access_token');

    const response = await fetch(`${API_BASE_URL}/printer/print-raw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
            ip,
            port,
            data: base64Data,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Print failed: ${response.status}`);
    }
};

/**
 * Test network printer connectivity
 */
export const testNetworkPrinter = async (
    ip: string,
    port: number = 9100
): Promise<{ reachable: boolean; message: string }> => {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${API_BASE_URL}/printer/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ip, port }),
    });

    return response.json();
};

// ============================================
// Unified Printer Functions
// ============================================

/**
 * Connect to printer based on current configuration
 * For USB: Opens device picker dialog
 * For Network: Validates connection is possible
 */
export const connectToPrinter = async (
    config?: PrinterConfig
): Promise<boolean> => {
    const printerConfig = config || currentPrinterConfig;

    if (config) {
        currentPrinterConfig = config;
    }

    if (printerConfig.type === 'usb') {
        return connectToUsbPrinter();
    } else {
        // For network, test connectivity
        try {
            const result = await testNetworkPrinter(
                printerConfig.ip,
                printerConfig.port
            );
            return result.reachable;
        } catch {
            return false;
        }
    }
};

/**
 * Send raw ESC/POS data to printer
 */
export const sendToPrinter = async (
    data: Uint8Array,
    config?: PrinterConfig
): Promise<void> => {
    const printerConfig = config || currentPrinterConfig;

    if (printerConfig.type === 'usb') {
        await sendToUsbPrinter(data);
    } else {
        await sendToNetworkPrinter(printerConfig.ip, printerConfig.port, data);
    }
};

/**
 * Print order to kitchen
 * Uses current printer configuration to route to USB or network
 */
export const printToKitchen = async (
    order: Order,
    config?: PrinterConfig
): Promise<void> => {
    const printerConfig = config || currentPrinterConfig;

    // For USB, ensure we're connected
    if (printerConfig.type === 'usb' && !hookedUsbPrinter) {
        const connected = await connectToUsbPrinter();
        if (!connected) throw new Error("No USB printer connected");
    }

    // Build ESC/POS data
    const encoder = new EscPosEncoder();

    let job = encoder
        .initialize()
        .codepage('cp437')
        .align('center')
        .bold(true)
        .line(`Table ${order.table_number || 'Takeout'}`)
        .bold(false)
        .line(`#${order.id.slice(-4)}`)
        .newline()
        .align('left');

    order.items.forEach(item => {
        job = job
            .text(`${item.quantity}x ${item.name}`)
            .newline();

        if (item.selected_modifiers && item.selected_modifiers.length > 0) {
            job = job.text(`   ${item.selected_modifiers.map(m => m.option).join(', ')}`).newline();
        }

        if (item.notes) {
            job = job.text(`   NB: ${item.notes}`).newline();
        }

        job = job.newline();
    });

    const currDate = new Date().toLocaleString('es-MX');
    job = job
        .newline()
        .align('center')
        .text(currDate)
        .newline()
        .cut();

    const data = job.encode();

    // Send to appropriate printer
    await sendToPrinter(data, printerConfig);
};

/**
 * Print cash closure receipt
 */
export const printCashClosure = async (
    summary: {
        cashier: string;
        openedAt: string;
        closedAt: string;
        openingAmount: number;
        cashSales: number;
        cardSales: number;
        totalDrops: number;
        expectedCash: number;
        realCash: number;
        difference: number;
    },
    config?: PrinterConfig
): Promise<void> => {
    const printerConfig = config || currentPrinterConfig;

    // For USB, ensure we're connected
    if (printerConfig.type === 'usb' && !hookedUsbPrinter) {
        const connected = await connectToUsbPrinter();
        if (!connected) throw new Error("No USB printer connected");
    }

    const encoder = new EscPosEncoder();

    const job = encoder
        .initialize()
        .codepage('cp437')
        .align('center')
        .bold(true)
        .line('CORTE DE CAJA')
        .bold(false)
        .newline()
        .align('left')
        .line(`Cajero: ${summary.cashier}`)
        .line(`Apertura: ${summary.openedAt}`)
        .line(`Cierre: ${summary.closedAt}`)
        .newline()
        .line('--------------------------------')
        .line(`Fondo inicial:    $${summary.openingAmount.toFixed(2)}`)
        .line(`Ventas efectivo:  $${summary.cashSales.toFixed(2)}`)
        .line(`Ventas tarjeta:   $${summary.cardSales.toFixed(2)}`)
        .line(`Retiros:         -$${summary.totalDrops.toFixed(2)}`)
        .line('--------------------------------')
        .bold(true)
        .line(`Esperado:         $${summary.expectedCash.toFixed(2)}`)
        .line(`Contado:          $${summary.realCash.toFixed(2)}`)
        .line(`Diferencia:       $${summary.difference.toFixed(2)}`)
        .bold(false)
        .newline()
        .cut();

    const data = job.encode();
    await sendToPrinter(data, printerConfig);
};
