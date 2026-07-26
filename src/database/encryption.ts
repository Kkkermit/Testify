import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ConfigurationError } from "../core/errors";

/**
 * AES-256-GCM at the application layer for third-party OAuth tokens. The key is
 * supplied through `TOKEN_ENCRYPTION_KEY`; without it, features that would persist
 * a user's Spotify or Riot token refuse to run rather than storing plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
// No dot: the payload itself is dot-delimited.
const PREFIX = "encv1";

function keyFrom(hexKey: string | undefined): Buffer {
	if (hexKey === undefined) {
		throw new ConfigurationError(
			"TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` before linking third-party accounts.",
		);
	}
	return Buffer.from(hexKey, "hex");
}

export function encryptToken(plaintext: string, hexKey: string | undefined): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, keyFrom(hexKey), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptToken(payload: string, hexKey: string | undefined): string {
	const [prefix, ivPart, tagPart, dataPart] = payload.split(".");
	if (prefix !== PREFIX || ivPart === undefined || tagPart === undefined || dataPart === undefined) {
		throw new Error("Stored token is not in the expected encrypted format");
	}

	const decipher = createDecipheriv(ALGORITHM, keyFrom(hexKey), Buffer.from(ivPart, "base64"));
	decipher.setAuthTag(Buffer.from(tagPart, "base64"));
	return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64")), decipher.final()]).toString("utf8");
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(`${PREFIX}.`);
}
