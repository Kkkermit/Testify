import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form/Warning";
import { type TranslationKey } from "@/i18n";
import { refusalText } from "@/lib/api";

/** Why a write was refused: the server's own words when it gave any, otherwise the fallback. */
export function Refusal({
	error,
	fallback = "common.couldNotSave",
}: {
	error: unknown;
	fallback?: TranslationKey;
}): React.JSX.Element | null {
	const { t } = useTranslation();
	if (error === null || error === undefined) return null;

	return <Warning>{refusalText(error, t(fallback))}</Warning>;
}
