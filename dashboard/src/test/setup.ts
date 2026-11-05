import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/test/handlers";
import "@/i18n";

// A loaded CI runner can push a render past the 1s default.
configure({ asyncUtilTimeout: 3_000 });

export const server = setupServer(...handlers);

// "error" rather than "warn": a request nothing handles is a test lying about what the API does.
beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	server.resetHandlers();
	// Any test that renders the shell remembers the bot's look, which would answer the next test before its request did.
	localStorage.removeItem("testify:botLook");
});

afterAll(() => {
	server.close();
});

// jsdom has no `matchMedia`, and the motion hooks read it.
window.matchMedia = jest.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
	dispatchEvent: jest.fn(),
}));

// jsdom lays nothing out, so these are stubbed; every browser the build targets has both.
globalThis.ResizeObserver = class {
	observe = jest.fn();
	unobserve = jest.fn();
	disconnect = jest.fn();
};

Element.prototype.scrollIntoView = jest.fn();

// Node's fetch demands an absolute URL where a browser resolves against the document, so the harness supplies the origin.
const nodeFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
	nodeFetch(typeof input === "string" && input.startsWith("/") ? new URL(input, window.location.origin) : input, init);
