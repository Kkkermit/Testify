import { type WelcomeStyle } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { RadioCard } from "@/components/form";
import { STYLE_LABELS } from "@/features/welcome/welcome.utils";

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
		<RadioCard
			name={group}
			label={t(label)}
			description={t(describes)}
			checked={checked}
			disabled={disabled}
			onChange={onChange}
		/>
	);
}
