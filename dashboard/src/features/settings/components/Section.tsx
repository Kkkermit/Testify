import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SavingIndicator, type SavingState, SettingRows, Warning } from "@/components/form";
import { ApiError } from "@/lib/api";

/** One setting as a group of rows, all the same shape, so adding one is a component rather than a layout decision. */
export function Section({
	title,
	describes,
	saving,
	failure = null,
	children,
}: {
	title: string;
	describes: string;
	saving: SavingState;
	/** The section's own write error, rendered here so a refusal lands beside the control that caused it. */
	failure?: Error | null;
	children: ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingRows title={title} description={describes} action={<SavingIndicator state={saving} />}>
			{children}
			{failure !== null && (
				<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
			)}
		</SettingRows>
	);
}
