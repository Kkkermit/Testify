import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { ApiError } from "@/lib/api";

/** A refusal has to say why, or a control that snaps back looks like a bug rather than a permission. */
export function Refusal({ error }: { error: unknown }): React.JSX.Element | null {
	// Before the early return: a hook after a conditional exit changes the call order between renders.
	const { t } = useTranslation();
	if (error === null || error === undefined) return null;

	const message = error instanceof ApiError ? error.message : t("common.couldNotSave");
	return <Warning>{message}</Warning>;
}
