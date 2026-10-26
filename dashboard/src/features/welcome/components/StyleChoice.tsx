import { type WelcomeStyle } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { STYLE_LABELS } from "@/features/welcome/welcome.utils";
import { cn } from "@/lib/cn";

/** One radio of a "Sent as" group; `group` keeps two groups on one page from sharing a selection. */
export function StyleChoice({
	group,
	style,
	checked,
	disabled,
	onChange,
}: {
	group: string;
	style: WelcomeStyle;
	checked: boolean;
	disabled: boolean;
	onChange: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const { label, describes } = STYLE_LABELS[style];

	return (
		<label
			className={cn(
				"rounded-card flex flex-col gap-1 border p-3 transition-colors duration-150",
				disabled ? "border-border opacity-50" : "cursor-pointer",
				checked ? "border-primary bg-primary/10" : !disabled && "border-border hover:border-input",
			)}
		>
			<span className="flex items-center gap-2">
				<input type="radio" name={group} checked={checked} disabled={disabled} onChange={onChange} />
				<span className="text-sm font-medium">{t(label)}</span>
			</span>
			<span className="text-muted-foreground text-xs">{t(describes)}</span>
		</label>
	);
}
