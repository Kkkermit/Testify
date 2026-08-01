import { AUDIT_EVENT_LABELS, type AuditEvent, type AuditGroup, auditEventsIn } from "@testify/shared";
import { useEffect, useRef } from "react";
import { CHECK_ROW } from "@/components/form";
import { type GroupState } from "@/features/audit-log/auditLog.utils";
import { cn } from "@/lib/cn";

/**
 * One part of a server as a short list, with a heading checkbox that ticks the lot. Eighteen flat checkboxes
 * are a wall; five groups of three or four are a decision.
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

	return (
		<fieldset className="border-border rounded-card border p-4">
			<legend className="px-1">
				<label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
					<input
						ref={heading}
						type="checkbox"
						checked={state === "all"}
						onChange={(event) => {
							onToggleGroup(event.target.checked);
						}}
					/>
					{group}
				</label>
			</legend>

			<div className="mt-1 flex flex-col">
				{inGroup.map((event) => {
					const look = AUDIT_EVENT_LABELS[event];
					const checked = events.includes(event);

					return (
						<label key={event} className={cn(CHECK_ROW, "hover:bg-muted rounded-lg px-2")}>
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
