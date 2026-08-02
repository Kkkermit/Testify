import { type CommandAvailability, type CommandSummary } from "@testify/shared";
import { ChevronRight, Lock, Shield } from "lucide-react";
import { Link } from "react-router";
import { Badge, Card, Tooltip } from "@/components/primitives";
import { featureLook } from "@/config/features";
import { type CommandPlace } from "@/features/commands/commands.utils";
import { CommandSwitch } from "@/features/commands/components/CommandSwitch";
import { cn } from "@/lib/cn";

export function CommandCard({
	command,
	prefix,
	place,
	availability,
	onToggle,
}: {
	command: CommandSummary;
	prefix: string;
	place: CommandPlace | null;
	/** Absent when nobody on this page may switch commands, which is most visitors on `/commands`. */
	availability?: CommandAvailability;
	onToggle?: (on: boolean) => void;
}): React.JSX.Element {
	const { icon: Icon, tint, wash } = featureLook(command.category);

	const off = availability === "off-here" || availability === "off-everywhere";

	return (
		<Card padding="compact" className={cn("flex flex-col gap-3", off && "opacity-60")}>
			<div className="flex items-start gap-3">
				<span className={cn("rounded-card mt-0.5 shrink-0 p-2", wash, tint)} aria-hidden="true">
					<Icon size={18} />
				</span>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<code className="font-mono text-sm font-medium">/{command.name}</code>
						{command.aliases.map((alias) => (
							<Tooltip key={alias} label={`Also answers to ${prefix}${alias}`}>
								<code tabIndex={0} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
									{prefix}
									{alias}
								</code>
							</Tooltip>
						))}
						{command.ownerOnly && (
							<Badge tone="warning">
								<Lock size={11} aria-hidden="true" className="mr-1 inline" />
								Owner
							</Badge>
						)}
						{command.nsfw && <Badge tone="warning">NSFW</Badge>}
					</div>

					<p className="text-muted-foreground mt-1 text-sm">{command.description}</p>
				</div>

				{availability !== undefined && onToggle !== undefined && (
					<CommandSwitch name={command.name} availability={availability} onChange={onToggle} />
				)}

				{place !== null && (
					<Link
						to={place.path}
						className="text-accent hover:bg-muted rounded-card group flex shrink-0 items-center gap-1 px-2 py-1 text-xs font-medium transition-colors duration-150"
					>
						Configure
						<ChevronRight
							size={13}
							aria-hidden="true"
							className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
						/>
					</Link>
				)}
			</div>

			{command.permissions.length > 0 && (
				<p className="text-muted-foreground flex items-center gap-1.5 text-xs">
					<Shield size={12} aria-hidden="true" className="shrink-0" />
					Needs {command.permissions.join(", ")}
				</p>
			)}

			{command.subcommands.length > 0 && (
				<ul className="divide-border border-border divide-y rounded-lg border">
					{command.subcommands.map((subcommand) => (
						<li key={subcommand.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2">
							<code className="font-mono text-xs">
								/{command.name} {subcommand.name}
							</code>
							<span className="text-muted-foreground min-w-0 flex-1 text-xs">{subcommand.description}</span>
						</li>
					))}
				</ul>
			)}

			{command.options.length > 0 && (
				<ul className="flex flex-wrap gap-1.5">
					{command.options.map((option) => (
						<Tooltip key={option.name} label={`${option.description} (${option.type})`}>
							<li
								tabIndex={0}
								className={cn(
									"rounded px-1.5 py-0.5 font-mono text-xs",
									option.required ? "bg-primary/15 text-accent" : "bg-muted text-muted-foreground",
								)}
							>
								{option.name}
								{option.required ? "" : "?"}
							</li>
						</Tooltip>
					))}
				</ul>
			)}
		</Card>
	);
}
