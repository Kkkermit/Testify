import { type FormEvent, type ReactNode, useId } from "react";
import { RowLayout } from "@/components/form/rowLayout";
import { CARD_HEADING } from "@/components/primitives/textStyles";

export function SettingRows({
	title,
	description,
	action,
	onSubmit,
	children,
}: {
	title?: string;
	description?: ReactNode;
	action?: ReactNode;
	onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
	children: ReactNode;
}): React.JSX.Element {
	const headingId = useId();
	const Panel = onSubmit === undefined ? "section" : "form";

	return (
		<Panel
			{...(title === undefined ? {} : { "aria-labelledby": headingId })}
			{...(onSubmit === undefined ? {} : { onSubmit })}
			className="bg-card border-border rounded-card divide-border divide-y border [&>*]:px-6 [&>*]:py-4"
		>
			{(title !== undefined || description !== undefined) && (
				<div className="flex items-start justify-between gap-3">
					<div>
						{title !== undefined && (
							<h2 id={headingId} className={CARD_HEADING}>
								{title}
							</h2>
						)}
						{description !== undefined && <p className="text-muted-foreground text-sm">{description}</p>}
					</div>
					{action}
				</div>
			)}
			<RowLayout.Provider value>{children}</RowLayout.Provider>
		</Panel>
	);
}
