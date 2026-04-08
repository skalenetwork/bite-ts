declare module '@skalenetwork/t-encrypt' {
    export function encryptMessage(message: string, publicKey: string, AADAES?: string, AADTE?: string): Promise<string>;
    export function encryptMessageDualKey(message: string, firstPublicKey: string, secondPublicKey: string, AADAES?: string, AADTE?: string): Promise<string>;
    export function encryptMessageMockup(message: string): Promise<string>;
}