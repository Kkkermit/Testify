import { type TFunction } from "i18next";
import { i18next } from "@/i18n";

/**
 * The real `t`, bound to English, for the pure helpers that take one.
 *
 * They are checked against the sentence a reader sees rather than against a key nobody reads, so the test has
 * to resolve it the same way the app does.
 */
export const t: TFunction = i18next.getFixedT("en");
