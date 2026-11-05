/** AES-256-GCM around one secret, keyed once by HKDF because the session secret is already key-length. */
export interface SecretBox {
	seal(plaintext: string): string;
	open(sealed: string): string | null;
}
