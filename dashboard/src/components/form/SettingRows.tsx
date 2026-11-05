import { type ReactNode, useId } from "react";
import { RowLayout } from "@/components/form/rowLayout";
import { CARD_HEADING } from "@/components/primitives/textStyles";

/** One panel of settings, a row each, divided by hairlines rather than split into cards. */
export function SettingRows({
	title,
	description,
	children,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
}): React.JSX.Element {
	const headingId = useId();

	return (
		<section
			{...(title === undefined ? {} : { "aria-labelledby": headingId })}
			className="bg-card border-border rounded-card divide-border divide-y border [&>*]:px-6 [&>*]:py-4"
		>
			{title !== undefined && (
				<div>
					<h2 id={headingId} className={CARD_HEADING}>
						{title}
					</h2>
					{description !== undefined && <p className="text-muted-foreground text-sm">{description}</p>}
				</div>
			)}
			<RowLayout.Provider value>{children}</RowLayout.Provider>
		</section>
	);
}
