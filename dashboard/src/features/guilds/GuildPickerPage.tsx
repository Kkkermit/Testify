import { Columns3, Search, ServerOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { GUILD_REFUSED_NOTICE } from "@/app/RequireGuild";
import { OWNER_ONLY_NOTICE } from "@/app/RequireOwner";
import { FIELD, Warning } from "@/components/form";
import { EmptyState, SectionHeading, PageHeader, Pager, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { comparable } from "@/features/compare/compare.utils";
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
	const [params, setParams] = useSearchParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [notice] = useState(() => (location.state as { notice?: string } | null)?.notice ?? null);

	useEffect(() => {
		// Taken out of history once read, so a refresh or Back does not say it again.
		if (notice !== null) void navigate(".", { replace: true, state: null });
	}, [notice, navigate]);

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
		document.getElementById(`guilds-${key}`)?.scrollIntoView({ block: "nearest" });
	}

	function searchFor(value: string): void {
		setSearch(value);
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
			{notice === OWNER_ONLY_NOTICE && <Warning>{t("guilds.ownerOnly")}</Warning>}
			{notice === GUILD_REFUSED_NOTICE && <Warning>{t("guilds.guildRefused")}</Warning>}

			<label className="relative block">
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

			{comparable(me.data?.guilds ?? []).length >= 2 && (
				<Link
					to="/guilds/compare"
					className={cn(INLINE_TARGET, "text-accent hover:text-foreground gap-2 self-start text-sm")}
				>
					<Columns3 size={16} aria-hidden="true" />
					{t("guilds.compare")}
				</Link>
			)}

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
								<SectionHeading as="h2" id={`guilds-${group.key}`} count={group.guilds.length}>
									{t(group.titleKey)}
								</SectionHeading>
								<p className="text-muted-foreground text-sm">{t(group.describesKey)}</p>
							</div>

							{/* A grid item defaults to `min-width: auto`, so the widest card sets the row and a phone gets a
							    horizontal scrollbar. */}
							<ul className="grid gap-4 sm:grid-cols-2 [&>li]:min-w-0">
								{shown.items.map((guild) => (
									<li key={guild.id}>
										<GuildCard guild={guild} group={group.key} clientId={bot.data?.id} />
									</li>
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
