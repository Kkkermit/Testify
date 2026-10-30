import { CircleDot, Eye, GitFork, Star, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, PAGE_TITLE, Skeleton, StatTile } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { SiteError } from "@/features/site/components/SiteError";
import { useStanding } from "@/features/source/useSource";
import { cn } from "@/lib/cn";

/** What GitHub says of the repository without a token, read once an hour at most and only because this page asked. */
export function Standing(): React.JSX.Element {
	const { t } = useTranslation();
	const standing = useStanding();
	const repo = standing.data;

	return (
		<header className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Eyebrow>{t("source.eyebrow")}</Eyebrow>
				<h1 className={PAGE_TITLE}>{t("source.title")}</h1>
				{repo === undefined ? (
					standing.isError ? null : (
						<Skeleton className="h-5 w-2/3" />
					)
				) : (
					<p className="text-muted-foreground max-w-3xl">
						<a href={repo.url} rel="noreferrer" className={cn(INLINE_TARGET, "text-accent font-mono text-sm")}>
							{repo.fullName}
						</a>
						{repo.description !== null && <> · {repo.description}</>}
					</p>
				)}
			</div>

			{standing.isError ? (
				<SiteError
					title={t("source.standingFailedTitle")}
					body={t("source.standingFailedBody")}
					onRetry={() => {
						void standing.refetch();
					}}
				/>
			) : repo === undefined ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[0, 1, 2, 3].map((tile) => (
						<Skeleton key={tile} className="h-20" />
					))}
				</div>
			) : (
				<>
					<ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("source.numbers")}>
						<li>
							<StatTile label={t("source.stars")} value={repo.stars} icon={Star} tint="text-warning" />
						</li>
						<li>
							<StatTile label={t("source.forks")} value={repo.forks} icon={GitFork} tint="text-accent" />
						</li>
						<li>
							<StatTile label={t("source.watchers")} value={repo.watchers} icon={Eye} tint="text-feature-tickets" />
						</li>
						<li>
							<StatTile
								label={t("source.openIssues")}
								value={repo.openIssues}
								icon={CircleDot}
								tint="text-success"
								hint={t("source.openIssuesHint")}
							/>
						</li>
					</ul>

					<Card padding="compact" className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<span className="flex items-center gap-2">
							<Tag size={14} aria-hidden="true" />
							{repo.latestRelease === null ? (
								t("source.noRelease")
							) : (
								<a
									href={repo.latestRelease.url}
									rel="noreferrer"
									className={cn(INLINE_TARGET, "hover:text-foreground")}
								>
									{t("source.latestRelease", { name: repo.latestRelease.name })}
								</a>
							)}
						</span>
						<span>{t("source.reading", { ref: repo.ref })}</span>
						{repo.license !== null && (
							<span>
								{repo.license.custom ? t("source.licenseOwn") : t("source.license", { name: repo.license.name })}
							</span>
						)}
					</Card>
				</>
			)}
		</header>
	);
}
