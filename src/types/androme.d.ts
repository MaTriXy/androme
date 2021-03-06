declare global {
    namespace androme {
        export function setFramework(value: {}, cached?: boolean): void;
        export function parseDocument(...elements: Undefined<string | Element>[]): FunctionMap<void>;
        export function include(value: {} | string): boolean;
        export function includeAsync(value: {} | string): boolean;
        export function exclude(value: {} | string): boolean;
        export function retrieve(value: string): {} | null;
        export function configure(value: {} | string, options: {}): boolean;
        export function ext(value: {} | string): {} | boolean | null;
        export function ready(): boolean;
        export function close(): void;
        export function reset(): void;
        export function saveAllToDisk(): void;
        export function toString(): string;
        export const settings: UserSettings;
        export const system: FunctionMap<any>;
    }
}

export {};