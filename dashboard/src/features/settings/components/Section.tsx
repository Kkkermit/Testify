import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SavingIndicator, type SavingState, Warning } from "@/components/form";
import { Card } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { ApiError } from "@/lib/api";

/** One setting, one card, all the same shape — so adding one is a component rather than a layout decision. */
export function Section({
	icon: Icon,
	tint,
	title,
	describes,
	saving,
	failure = null,
	children,
}: {
	icon: LucideIcon;
	tint: string;
	title: string;
	describes: string;
	saving: SavingState;
	/** The section's own write error, rendered here so a refusal lands beside the control that caused it. */
	failure?: Error | null;
	children: ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();
	return (
		/**
		 * What it is on the left, what you can change on the right. A settings card is a small form beside a
		 * sentence explaining it, and stacking those two into a narrow column is what left the page packing
		 * cards of wildly different heights into columns that could not balance.
		 */
		<Card className="motion-pop flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
			<div className="flex items-start gap-3 lg:w-72 lg:shrink-0">
				<span aria-hidden="true" className={`bg-muted rounded-lg p-2 ${tint}`}>
					<Icon size={18} />
				</span>
				<div className="min-w-0 flex-1">
					<h2 className={CARD_HEADING}>{title}</h2>
					<p className="text-muted-foreground text-sm">{describes}</p>
				</div>
				<SavingIndicator state={saving} />
			</div>

			{/* Capped at a readable measure rather than filling: a prefix box the width of the page is not a form. */}
			<div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-xl">
				{children}

				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
				)}
			</div>
		</Card>
	);
}
