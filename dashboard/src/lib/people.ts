import { DELETED_USER_NAME } from "@testify/shared";
import { type TFunction } from "i18next";

/** A name as a record stores it, in the reader's own words for somebody who deleted their data. */
export function personName(name: string, t: TFunction): string {
	return name === DELETED_USER_NAME ? t("common.deletedAccount") : name;
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** The first character a reader would see in a name, so a flag or a family emoji is never cut in half. */
export function initialOf(name: string): string | null {
	const [first] = GRAPHEMES.segment(name.trim());
	return first === undefined ? null : first.segment.toLocaleUpperCase();
}
