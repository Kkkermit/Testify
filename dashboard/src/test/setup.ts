import "@testing-library/jest-dom";
import { setupServer } from "msw/node";
import { handlers } from "@/test/handlers";
// Initialises the shared i18next instance, so every component under test resolves keys rather than rendering them.
import "@/i18n";

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

// jsdom has no matchMedia, and the motion hooks read it; "no preference" puts the animated path under test, and individual tests override it.
window.matchMedia = jest.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
	dispatchEvent: jest.fn(),
}));

// jsdom lays nothing out, so it implements neither of these and anything measuring an element gets zeroes
// either way. Both are far below the build's browser target, so no component guards for their absence.
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
