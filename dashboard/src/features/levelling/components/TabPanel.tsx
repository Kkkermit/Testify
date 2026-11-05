import { type ReactNode } from "react";
import { SavingIndicator, type SavingState, SettingRows } from "@/components/form";

/** A tab's settings as rows under its description and saving indicator; no heading, because the tab names the panel. */
export function TabPanel({
	description,
	saving,
	children,
}: {
	description: string;
	saving: SavingState;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<SettingRows description={description} action={<SavingIndicator state={saving} />}>
			{children}
		</SettingRows>
	);
}
