import { type ReactNode } from "react";
import { SavingIndicator, type SavingState, SettingRows } from "@/components/form";

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
