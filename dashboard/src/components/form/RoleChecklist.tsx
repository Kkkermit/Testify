import { type RoleSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { CheckList, type CheckItem } from "@/components/form/CheckList";
import { RoleSwatch } from "@/components/form/RoleSwatch";

/** A checkbox list rather than `<select multiple>`, which is close to unusable with a keyboard and on touch. */
export function RoleChecklist({
	roles,
	value,
	onChange,
	label,
	hint,
	max,
	requireAssignable = false,
	forbidPowerful = false,
}: {
	roles: RoleSummary[];
	value: string[];
	onChange: (roleIds: string[]) => void;
	label: string;
	hint?: string;
	max: number;
	requireAssignable?: boolean;
	/** For roles members hand themselves, where one that moderates or administers is never allowed. */
	forbidPowerful?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const items: CheckItem[] = roles.map((role) => {
		const aboveBot = requireAssignable && !role.assignableByBot;
		const powerful = forbidPowerful && role.powerful;

		return {
			id: role.id,
			label: <RoleSwatch name={role.name} colour={role.colour} />,
			blocked: aboveBot || powerful,
			blockedNote: aboveBot ? t("common.aboveBot") : t("common.tooPowerful"),
		};
	});

	return (
		<CheckList
			label={label}
			{...(hint === undefined ? {} : { hint })}
			items={items}
			value={value}
			max={max}
			onChange={onChange}
		/>
	);
}
