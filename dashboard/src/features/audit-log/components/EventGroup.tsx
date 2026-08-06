import { AUDIT_EVENT_LABELS, type AuditEvent, type AuditGroup, auditEventsIn } from "@testify/shared";
import { useEffect, useRef } from "react";
import { CHECK_ROW } from "@/components/form";
import { type GroupState } from "@/features/audit-log/auditLog.utils";
import { cn } from "@/lib/cn";

/**
 * One part of a server as its own panel, with a heading checkbox that ticks the lot. Eighteen flat checkboxes
 * are a wall; five bordered groups of three or four say which part of the server each one is about.
 */
export function EventGroup({
	group,
	state,
	events,
	onToggleGroup,
	onToggleEvent,
}: {
	group: AuditGroup;
	state: GroupState;
	events: AuditEvent[];
	onToggleGroup: (on: boolean) => void;
	onToggleEvent: (event: AuditEvent) => void;
}): React.JSX.Element {
	const heading = useRef<HTMLInputElement>(null);

	// `indeterminate` is a property, not an attribute, so React cannot set it from JSX.
	useEffect(() => {
		if (heading.current !== null) heading.current.indeterminate = state === "some";
	}, [state]);

	const inGroup = auditEventsIn(group);
	const chosen = inGroup.filter((event) => events.includes(event)).length;

	return (
		<fieldset className="border-border bg-background/40 rounded-card min-w-0 border">
			<legend className="sr-only">{group}</legend>

			{/* The count is beside the label rather than inside it: it is a status, not part of the tickbox's name. */}
			<div className="border-border flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold">
				<label className="hover:text-accent flex min-w-0 flex-1 cursor-pointer items-center gap-2 transition-colors duration-150">
					<input
						ref={heading}
						type="checkbox"
						checked={state === "all"}
						onChange={(event) => {
							onToggleGroup(event.target.checked);
						}}
					/>
					<span className="min-w-0 truncate">{group}</span>
				</label>
				<span className="text-muted-foreground text-xs font-normal tabular-nums">
					{chosen}/{inGroup.length}
				</span>
			</div>

			<div className="flex flex-col p-1">
				{inGroup.map((event) => {
					const look = AUDIT_EVENT_LABELS[event];
					const checked = events.includes(event);

					return (
						<label key={event} className={cn(CHECK_ROW, "hover:bg-muted cursor-pointer rounded-lg py-1.5")}>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => {
									onToggleEvent(event);
								}}
							/>
							<span className="min-w-0">
								<span className="block truncate font-medium">{look.label}</span>
								<span className="text-muted-foreground block truncate text-xs">{look.describes}</span>
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
