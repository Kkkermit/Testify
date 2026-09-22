/** The types more than one module in this domain shares. */

/**
 * AES-256-GCM around a single secret, for values that must survive a database dump without being readable —
 * today the Discord OAuth tokens on a dashboard session.
 *
 * The key is derived once per box rather than per call, and the derivation is HKDF rather than scrypt because
 * `DASHBOARD_SESSION_SECRET` is required to be long enough to be a key already; stretching it would only cost
 * 100ms per request.
 */
export interface SecretBox {
	seal(plaintext: string): string;
	open(sealed: string): string | null;
}
