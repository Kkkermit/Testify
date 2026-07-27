/**
 * Everything that configures the bot. Values only — no logic, no environment reads except env.ts itself.
 *
 * Re-exported with `export *` so the barrel maintains itself — adding a file
 * here needs no edit. Import a module directly (`@config/theme`) when you only
 * want one; the barrel is for when you want several.
 */

export * from "./categories";
export * from "./constants";
export * from "./env";
export * from "./strings";
export * from "./theme";
