import { type ReactNode } from "react";
import { Refusal, SavingIndicator, type SavingState, SettingRows } from "@/components/form";

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
	failure?: Error | null;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<SettingRows title={title} description={describes} action={<SavingIndicator state={saving} />}>
			{children}
			<Refusal error={failure} />
		</SettingRows>
	);
}
