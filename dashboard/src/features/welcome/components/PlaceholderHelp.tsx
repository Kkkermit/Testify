import { WELCOME_PLACEHOLDERS } from "@testify/shared";
import { Tooltip } from "@/components/primitives";

/** Clicking a token inserts it, because retyping `{username}` exactly is the sort of thing people get wrong. */
export function PlaceholderHelp({
	onInsert,
	disabled = false,
}: {
	onInsert: (token: string) => void;
	disabled?: boolean;
}): React.JSX.Element {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-muted-foreground text-xs">Insert:</span>
			{WELCOME_PLACEHOLDERS.map(({ token, describes }) => (
				<Tooltip key={token} label={describes}>
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							onInsert(token);
						}}
						className="bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded px-2 py-1 font-mono text-xs transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50"
					>
						{token}
					</button>
				</Tooltip>
			))}
		</div>
	);
}
