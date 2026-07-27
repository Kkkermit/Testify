/**
 * The framework: the client, the loader, the module contracts and the error boundary.
 *
 * Re-exported with `export *` so the barrel maintains itself — adding a file
 * here needs no edit. Import a module directly (`@lib/embeds`) when you only
 * want one; the barrel is for when you want several.
 */

export * from "./button";
export * from "./checks";
export * from "./client";
export * from "./command";
export * from "./errors";
export * from "./event";
export * from "./loader";
export * from "./logger";
export * from "./message";
export * from "./paths";
export * from "./prefix";
export * from "./shutdown";
