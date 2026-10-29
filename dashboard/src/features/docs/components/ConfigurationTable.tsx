import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Skeleton } from "@/components/primitives";
import { LOADERS } from "@/features/docs/docs.pages";
import { variablesIn } from "@/features/docs/markdown.utils";
import { SiteError } from "@/features/site/components/SiteError";
import { keys } from "@/lib/queries";

/** The four the bot will not start without, as `src/config/env.ts` declares them; a test holds the two together. */
export const REQUIRED_VARIABLES = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_OWNER_IDS", "MONGODB_URI"] as const;

const required = new Set<string>(REQUIRED_VARIABLES);

/** Every variable in `.env.example`, grouped as the template groups them, with the comment written above it. */
export function ConfigurationTable(): React.JSX.Element {
	const { t } = useTranslation();
	const template = useQuery({
		queryKey: keys.docs("configuration"),
		queryFn: LOADERS[".env.example"],
		staleTime: Infinity,
	});
	const groups = useMemo(() => {
		const found = new Map<string, ReturnType<typeof variablesIn>>();
		for (const variable of variablesIn(template.data ?? "")) {
			const group = variable.group ?? "";
			found.set(group, [...(found.get(group) ?? []), variable]);
		}
		return [...found.entries()];
	}, [template.data]);

	if (template.isError) return <SiteError title={t("docs.failedTitle")} body={t("docs.failedBody")} />;
	if (template.data === undefined) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="flex flex-col gap-6">
			<p className="leading-relaxed">{t("docs.configuration.intro")}</p>
			{groups.map(([group, variables]) => (
				<section
					key={group}
					aria-label={group === "" ? t("docs.configuration.general") : group}
					className="flex flex-col gap-3"
				>
					<h2 className="font-display text-xl font-bold tracking-tight">
						{group === "" ? t("docs.configuration.general") : group}
					</h2>
					<dl className="border-border divide-border rounded-card flex flex-col divide-y border">
						{variables.map((variable) => (
							<div key={variable.name} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
								<dt className="flex shrink-0 flex-wrap items-start gap-2 sm:w-72">
									<code className="font-mono text-[0.8125rem] font-medium break-all">{variable.name}</code>
									{required.has(variable.name) && <Badge tone="warning">{t("docs.configuration.required")}</Badge>}
								</dt>
								<dd className="text-muted-foreground text-sm">
									{variable.description === "" ? t("docs.configuration.noComment") : variable.description}
									{variable.example !== "" && (
										<span className="text-foreground mt-1 block font-mono text-xs">
											{t("docs.configuration.example", { value: variable.example })}
										</span>
									)}
								</dd>
							</div>
						))}
					</dl>
				</section>
			))}
		</div>
	);
}
