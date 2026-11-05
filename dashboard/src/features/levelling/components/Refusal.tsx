import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { ApiError } from "@/lib/api";

export function Refusal({ error }: { error: unknown }): React.JSX.Element | null {
	const { t } = useTranslation();
	if (error === null || error === undefined) return null;

	const message = error instanceof ApiError ? error.message : t("common.couldNotSave");
	return <Warning>{message}</Warning>;
}
