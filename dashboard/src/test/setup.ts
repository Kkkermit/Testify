import "@testing-library/jest-dom";
import { setupServer } from "msw/node";
import { handlers } from "@/test/handlers";

export const server = setupServer(...handlers);

// "error" rather than "warn": a request nothing handles is a test lying about what the API does.
beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

// jsdom has no matchMedia at all, and the motion hooks read it. Defaulting to "no preference" means the
// animated path — the one production runs — is the one under test; individual tests override it.
window.matchMedia = jest.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
	dispatchEvent: jest.fn(),
}));

// Node's fetch demands an absolute URL where a browser resolves against the document. `lib/api.ts` is
// browser code and requests "/api/…", so the harness supplies the origin jsdom would have.
const nodeFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
	nodeFetch(typeof input === "string" && input.startsWith("/") ? new URL(input, window.location.origin) : input, init);
