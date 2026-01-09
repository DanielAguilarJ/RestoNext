// WebUSB Types (Partial)
interface USBDevice {
    open(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    configuration: {
        interfaces: {
            alternate: {
                endpoints: {
                    direction: 'in' | 'out';
                    endpointNumber: number;
                }[];
            };
        }[];
    } | null;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
}

interface Navigator {
    usb: {
        requestDevice(options?: { filters: any[] }): Promise<USBDevice>;
    };
}

// ESC/POS Encoder
declare module 'esc-pos-encoder' {
    export default class EscPosEncoder {
        initialize(): this;
        codepage(page: string): this;
        align(alignment: 'left' | 'center' | 'right'): this;
        bold(active: boolean): this;
        line(text: string): this;
        newline(): this;
        text(text: string): this;
        cut(): this;
        encode(): Uint8Array;
    }
}
