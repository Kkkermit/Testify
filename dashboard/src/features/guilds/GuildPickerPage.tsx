import { Search, ServerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { EmptyState, Eyebrow, PageHeader, Pager, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { GuildCard } from "@/features/guilds/GuildCard";
import {
	filterGuilds,
	type GuildGroupKey,
	groupGuilds,
	GUILDS_PER_PAGE,
	searchIsWorthFocusing,
} from "@/features/guilds/guilds.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { pageFrom, pageOf } from "@/lib/paging";

export function GuildPickerPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("guilds.title"));
	const me = useMe();
	const bot = useBot();
	const [search, setSearch] = useState("");
	// One page number per section, in the URL, so Back and a refresh land where the reader was.
	const [params, setParams] = useSearchParams();

	const groups = useMemo(() => groupGuilds(filterGuilds(me.data?.guilds ?? [], search)), [me.data, search]);
	const found = groups.reduce((total, group) => total + group.guilds.length, 0);

	if (me.isPending) return <PickerSkeleton />;

	function turn(key: GuildGroupKey, page: number): void {
		setParams((current) => {
			const next = new URLSearchParams(current);
			if (page <= 1) next.delete(key);
			else next.set(key, String(page));
			return next;
		});
		// The pager sits under the list, so a shorter last page would otherwise leave the reader below it.
		document.getElementById(`guilds-${key}`)?.scrollIntoView({ block: "nearest" });
	}

	function searchFor(value: string): void {
		setSearch(value);
		// A new search is a new list, so every section starts again from its first page.
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				for (const group of groups) next.delete(group.key);
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<>
			<PageHeader title={t("guilds.title")} subtitle={t("guilds.subtitle")} />

			<label className="motion-reveal relative block">
				<span className="sr-only">{t("guilds.search")}</span>
				<Search
					size={18}
					aria-hidden="true"
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
				/>
				<input
					type="search"
					autoFocus={searchIsWorthFocusing(me.data?.guilds.length ?? 0)}
					value={search}
					onChange={(event) => {
						searchFor(event.target.value);
					}}
					placeholder={t("guilds.search")}
					className={cn(FIELD, "py-3 pr-4 pl-12 text-base")}
				/>
			</label>

			{found === 0 ? (
				<EmptyState
					icon={<ServerOff size={28} />}
					title={t(search === "" ? "guilds.emptyTitle" : "guilds.noMatchTitle")}
					body={t(search === "" ? "guilds.emptyBody" : "guilds.noMatchBody")}
					action={
						search === "" ? (
							<Link to="/help" className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}>
								{t("help.title")}
							</Link>
						) : undefined
					}
				/>
			) : (
				groups.map((group) => {
					const shown = pageOf(group.guilds, pageFrom(params.get(group.key)), GUILDS_PER_PAGE);

					return (
						<section key={group.key} aria-labelledby={`guilds-${group.key}`} className="flex flex-col gap-3">
							<div className="flex flex-col gap-1">
								<Eyebrow as="h2" id={`guilds-${group.key}`} count={group.guilds.length}>
									{t(group.titleKey)}
								</Eyebrow>
								<p className="text-muted-foreground text-sm">{t(group.describesKey)}</p>
							</div>

							{/* A grid item defaults to `min-width: auto`, so the widest card sets the row and a phone gets a
							    horizontal scrollbar. */}
							<ul className="grid gap-4 sm:grid-cols-2 [&>li]:min-w-0">
								{shown.items.map((guild, index) => (
									<Reveal as="li" key={guild.id} index={index}>
										<GuildCard guild={guild} group={group.key} clientId={bot.data?.id} />
									</Reveal>
								))}
							</ul>

							<Pager
								page={shown.page}
								pages={shown.pages}
								label={t("guilds.pagesOf", { group: t(group.titleKey) })}
								onChange={(page) => {
									turn(group.key, page);
								}}
							/>
						</section>
					);
				})
			)}
		</>
	);
}

function PickerSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-40" />
			<Skeleton className="h-12 w-full" />
			<div className="grid gap-4 sm:grid-cols-2">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[74px]" />
				))}
			</div>
		</>
	);
}
