import { type AutomodAction, type AutomodRuleSummary } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { Toggle } from "@/components/form";
import { Badge, cardClass, Button } from "@/components/primitives";

const ACTION_LABEL: Record<AutomodAction, string> = {
	block: "Blocks the message",
	alert: "Alerts moderators",
	timeout: "Times the member out",
	other: "Does something else",
};

export function RuleRow({
	rule,
	busy,
	onToggle,
	onRemove,
}: {
	rule: AutomodRuleSummary;
	busy: boolean;
	onToggle: (enabled: boolean) => void;
	onRemove: () => void;
}): React.JSX.Element {
	return (
		<li className={cardClass("compact", "flex flex-wrap items-center gap-3")}>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="truncate text-sm font-medium">{rule.name}</h3>
					{rule.fromTestify && <Badge>Added by Testify</Badge>}
				</div>
				<p className="text-muted-foreground text-xs">
					{rule.trigger}
					{rule.actions.length > 0 && ` — ${rule.actions.map((action) => ACTION_LABEL[action]).join(", ")}`}
				</p>
			</div>

			<Toggle label={`Enable ${rule.name}`} hideLabel checked={rule.enabled} disabled={busy} onChange={onToggle} />

			<Button variant="ghost" aria-label={`Remove ${rule.name}`} disabled={busy} onClick={onRemove}>
				<Trash2 size={16} aria-hidden="true" />
			</Button>
		</li>
	);
}
