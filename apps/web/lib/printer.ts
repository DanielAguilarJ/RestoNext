import EscPosEncoder from 'esc-pos-encoder';
import { Order } from '../../../packages/shared/src/index';

// Vendor IDs for common printers (Epson, Star, etc.)
// This filters the USB device picker list (optional but good UX)
const PRINTER_FILTERS = [
    { vendorId: 0x04b8 }, // Epson
    { vendorId: 0x0519 }, // Star Micronics
    // Add generic or others as needed, or leave empty to show all
];

let hookedPrinter: USBDevice | null = null;

export const connectToPrinter = async (): Promise<boolean> => {
    try {
        if (!navigator.usb) {
            console.error("WebUSB not supported in this browser");
            return false;
        }

        const device = await navigator.usb.requestDevice({
            filters: [] // Show all devices for now to be safe
        });

        if (device) {
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            await device.claimInterface(0);
            hookedPrinter = device;
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to connect to printer", e);
        return false;
    }
};

export const printToKitchen = async (order: Order) => {
    if (!hookedPrinter) {
        const connected = await connectToPrinter();
        if (!connected) throw new Error("No printer connected");
    }

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

    // Send to USB
    // Endpoint 1 is standard for many printers, but might vary.
    // We should ideally find the 'out' endpoint.
    // For simplicity, we assume bulk transfer to first out endpoint found.
    const endpoint = hookedPrinter?.configuration?.interfaces[0].alternate.endpoints.find(e => e.direction === 'out');

    if (hookedPrinter && endpoint) {
        await hookedPrinter.transferOut(endpoint.endpointNumber, data as unknown as BufferSource);
    } else {
        throw new Error("Could not find output endpoint on printer");
    }
};
