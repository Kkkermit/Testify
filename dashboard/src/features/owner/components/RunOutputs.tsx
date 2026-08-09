import { type CommandRunResult } from "@testify/shared";
import { Info } from "lucide-react";
import { Warning } from "@/components/form";
import { Card } from "@/components/primitives";
import { hexColour } from "@/features/owner/runner.utils";
import { clockTime } from "@/lib/datetime";

/**
 * What the command replied with, drawn as cards.
 *
 * An embed becomes a card with its accent down the left edge — close enough to read like the Discord message it
 * would have been, without pretending to be one. Anything that could not cross the gap is named rather than
 * missing, because a reader who cannot see that a reply had buttons would think the command did less than it
 * did.
 */
export function RunOutputs({ result }: { result: CommandRunResult }): React.JSX.Element {
	return (
		<Card className="flex flex-col gap-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-display text-base font-bold tracking-tight">
					<span className="font-mono">
						/{result.command}
						{result.subcommand === null ? "" : ` ${result.subcommand}`}
					</span>{" "}
					replied
				</h2>
				<time className="text-muted-foreground text-xs" dateTime={result.ranAt}>
					{clockTime(result.ranAt)}
				</time>
			</div>

			{result.outputs.length === 0 && <p className="text-muted-foreground text-sm">It replied with nothing.</p>}

			{result.outputs.map((output, index) => {
				if (output.kind === "text") {
					return (
						<p key={index} className="text-sm whitespace-pre-wrap">
							{output.content}
						</p>
					);
				}

				if (output.kind === "dropped") {
					return (
						<p key={index} className="text-muted-foreground flex items-center gap-2 text-sm">
							<Info size={15} aria-hidden="true" />
							The reply also carried {output.what}, which only works inside Discord.
						</p>
					);
				}

				const accent = hexColour(output.colour);

				return (
					<article
						key={index}
						className="border-border bg-muted/40 rounded-field border border-l-4 py-3 pr-4 pl-4"
						{...(accent === null ? {} : { style: { borderLeftColor: accent } })}
					>
						{output.title !== null && <h3 className="text-sm font-semibold">{output.title}</h3>}
						{output.description !== null && <p className="mt-1 text-sm whitespace-pre-wrap">{output.description}</p>}

						{output.fields.length > 0 && (
							<dl className="mt-3 grid gap-3 sm:grid-cols-2">
								{output.fields.map((field) => (
									<div key={field.name} className={field.inline ? "" : "sm:col-span-2"}>
										<dt className="text-xs font-medium">{field.name}</dt>
										<dd className="text-muted-foreground text-sm whitespace-pre-wrap">{field.value}</dd>
									</div>
								))}
							</dl>
						)}

						{output.footer !== null && <p className="text-muted-foreground mt-3 text-xs">{output.footer}</p>}
					</article>
				);
			})}

			{result.degraded && (
				<Warning>Part of this reply only works inside Discord. Run it there to use the controls it offered.</Warning>
			)}
		</Card>
	);
}
