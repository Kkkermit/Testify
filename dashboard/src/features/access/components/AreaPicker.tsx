import { type AccessArea } from "@testify/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { CHECK_ROW } from "@/components/form";
import { type AreaGroup, areaGroups, inOrder } from "@/features/access/access.utils";
import { cn } from "@/lib/cn";

const GROUPS: AreaGroup[] = areaGroups();

/** Every screen that can be given, under the sidebar's own headings, each heading ticking its whole section. */
export function AreaPicker({
	value,
	disabled = false,
	onChange,
}: {
	value: readonly AccessArea[];
	disabled?: boolean;
	onChange: (areas: AccessArea[]) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const id = useId();
	const chosen = new Set(value);

	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{GROUPS.map((group) => {
				const areas = group.choices.map((choice) => choice.area);
				const all = areas.every((area) => chosen.has(area));
				const some = !all && areas.some((area) => chosen.has(area));
				const headingId = `${id}-${group.labelKey}`;

				return (
					<div key={group.labelKey} role="group" aria-labelledby={headingId} className="flex flex-col gap-1">
						<label className={cn(CHECK_ROW, "font-medium", !disabled && "hover:bg-muted cursor-pointer")}>
							<input
								type="checkbox"
								checked={all}
								disabled={disabled}
								ref={(box) => {
									if (box !== null) box.indeterminate = some;
								}}
								onChange={() => {
									onChange(inOrder(all ? value.filter((area) => !areas.includes(area)) : [...value, ...areas]));
								}}
							/>
							<span id={headingId}>{t(group.labelKey)}</span>
						</label>
						{group.choices.map(({ area, labelKey, icon: Icon }) => (
							<label key={area} className={cn(CHECK_ROW, "pl-8", !disabled && "hover:bg-muted cursor-pointer")}>
								<input
									type="checkbox"
									checked={chosen.has(area)}
									disabled={disabled}
									onChange={() => {
										onChange(inOrder(chosen.has(area) ? value.filter((other) => other !== area) : [...value, area]));
									}}
								/>
								<Icon size={15} aria-hidden="true" className="text-muted-foreground shrink-0" />
								{t(labelKey)}
							</label>
						))}
					</div>
				);
			})}
		</div>
	);
}
