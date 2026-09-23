import { type TFunction } from "i18next";
import { i18next } from "@/i18n";

/** The real `t`, bound to English, for the pure helpers that take one. */
export const t: TFunction = i18next.getFixedT("en");
