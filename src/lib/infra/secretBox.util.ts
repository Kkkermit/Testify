import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { type SecretBox } from "@lib/infra/infra.types";

const VERSION = "v1";
const IV_BYTES = 12;
const INFO = "testify-dashboard-tokens";

export function createSecretBox(secret: string, salt = "testify"): SecretBox {
	const key = Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from(salt), Buffer.from(INFO), 32));

	return {
		seal(plaintext) {
			const iv = randomBytes(IV_BYTES);
			const cipher = createCipheriv("aes-256-gcm", key, iv);
			const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
			const parts = [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url"));

			return [VERSION, ...parts].join(".");
		},

		open(sealed) {
			const [version, iv, tag, body] = sealed.split(".");
			if (version !== VERSION || iv === undefined || tag === undefined || body === undefined) return null;

			try {
				const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
				decipher.setAuthTag(Buffer.from(tag, "base64url"));

				return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
			} catch {
				// A wrong key or a tampered value fails the tag check. Neither is a bug worth a stack trace.
				return null;
			}
		},
	};
}

/** Compares two secrets without leaking, through timing, how much of a guess was right. */
export function secretsMatch(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);

	return left.length === right.length && timingSafeEqual(left, right);
}
