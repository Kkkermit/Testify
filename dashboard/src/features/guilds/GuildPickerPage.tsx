import { Search, ServerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { GuildCard } from "@/features/guilds/GuildCard";
import { filterGuilds, groupGuilds, searchIsWorthFocusing } from "@/features/guilds/guilds.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function GuildPickerPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("guilds.title"));
	const me = useMe();
	const bot = useBot();
	const [search, setSearch] = useState("");

	const groups = useMemo(() => groupGuilds(filterGuilds(me.data?.guilds ?? [], search)), [me.data, search]);
	const found = groups.reduce((total, group) => total + group.guilds.length, 0);

	if (me.isPending) return <PickerSkeleton />;

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
						setSearch(event.target.value);
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
				/>
			) : (
				groups.map((group) => (
					<section key={group.key} aria-labelledby={`guilds-${group.key}`} className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<Eyebrow as="h2" id={`guilds-${group.key}`} count={group.guilds.length}>
								{t(group.titleKey)}
							</Eyebrow>
							<p className="text-muted-foreground text-sm">{t(group.describesKey)}</p>
						</div>

						<ul className="grid gap-4 sm:grid-cols-2">
							{group.guilds.map((guild, index) => (
								<Reveal as="li" key={guild.id} index={index}>
									<GuildCard guild={guild} group={group.key} clientId={bot.data?.id} />
								</Reveal>
							))}
						</ul>
					</section>
				))
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
