import { type RoleSummary } from "@testify/shared";
import { CheckList, type CheckItem } from "@/components/form/CheckList";
import { RoleSwatch } from "@/components/form/RoleSwatch";

/**
 * A checkbox list rather than a `<select multiple>`: the latter is close to unusable with a keyboard and on
 * touch, and this is a list people revisit. Roles the bot could not grant are greyed with the reason, which is
 * the same check the bot makes at runtime.
 */
export function RoleChecklist({
	roles,
	value,
	onChange,
	label,
	hint,
	max,
	requireAssignable = false,
}: {
	roles: RoleSummary[];
	value: string[];
	onChange: (roleIds: string[]) => void;
	label: string;
	hint?: string;
	max: number;
	requireAssignable?: boolean;
}): React.JSX.Element {
	const items: CheckItem[] = roles.map((role) => ({
		id: role.id,
		label: <RoleSwatch name={role.name} colour={role.colour} />,
		blocked: requireAssignable && !role.assignableByBot,
		blockedNote: "above Testify",
	}));

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
