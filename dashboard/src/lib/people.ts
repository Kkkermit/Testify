import { DELETED_USER_NAME } from "@testify/shared";
import { type TFunction } from "i18next";

/** A name as a record stores it, in the reader's own words for somebody who deleted their data. */
export function personName(name: string, t: TFunction): string {
	return name === DELETED_USER_NAME ? t("common.deletedAccount") : name;
}
