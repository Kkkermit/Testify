import { type MemberWarning } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { Badge, Button } from "@/components/primitives";
import { shortDate } from "@/lib/datetime";

export function WarningList({
	warnings,
	busy,
	canModerate,
	onRemove,
}: {
	warnings: MemberWarning[];
	busy: boolean;
	canModerate: boolean;
	onRemove: (warnId: string) => void;
}): React.JSX.Element {
	return (
		<ul className="flex flex-col gap-3">
			{warnings.map((warning) => (
				<li
					key={warning.id}
					className="border-border flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
				>
					<div className="min-w-0">
						<p className="text-sm break-words">{warning.reason}</p>
						<p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
							<span>
								by {warning.byTag} · <time dateTime={warning.at}>{shortDate(warning.at)}</time>
							</span>
							{warning.edited && <Badge tone="warning">Edited</Badge>}
						</p>
					</div>

					{canModerate && (
						<Button
							variant="ghost"
							disabled={busy}
							onClick={() => {
								onRemove(warning.id);
							}}
						>
							<Trash2 size={16} aria-hidden="true" />
							<span className="sr-only">Remove the warning for {warning.reason}</span>
						</Button>
					)}
				</li>
			))}
		</ul>
	);
}
