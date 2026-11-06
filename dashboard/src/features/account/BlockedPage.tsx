import { useQueryClient } from "@tanstack/react-query";
import { type BlacklistNotice, type DashboardUser } from "@testify/shared";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button, Card, DataList, PageHeader, PublicPage } from "@/components/primitives";
import { DataTab } from "@/features/account/components/DataTab";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/datetime";
import { hardRedirect } from "@/lib/redirect";

/** All a blocked account is shown once signed in: why, whom to ask, and the one thing it may still do. */
export function BlockedPage({ user, notice }: { user: DashboardUser; notice: BlacklistNotice }): React.JSX.Element {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	usePageTitle(t("blocked.title"));

	return (
		<PublicPage>
			<PageHeader
				title={t("blocked.title")}
				subtitle={t("blocked.signedInAs", { name: user.username })}
				action={
					<Button
						variant="ghost"
						onClick={() => {
							void api.post("/auth/logout").finally(() => {
								queryClient.clear();
								hardRedirect("/sign-in");
							});
						}}
					>
						<LogOut size={16} aria-hidden="true" /> {t("nav.signOut")}
					</Button>
				}
			/>

			<Warning>{t("blocked.body")}</Warning>

			<Card padding="none">
				<DataList
					rows={[
						{ label: t("blocked.reason"), value: notice.reason.trim() === "" ? t("blocked.noReason") : notice.reason },
						{ label: t("blocked.since"), value: shortDate(notice.since) },
					]}
				/>
			</Card>

			<section aria-labelledby="blocked-mistake" className="flex flex-col gap-2">
				<h2 id="blocked-mistake" className="text-base font-semibold">
					{t("blocked.mistakeTitle")}
				</h2>
				<p className="text-muted-foreground max-w-prose text-sm">
					{notice.owners.length === 0 ? t("blocked.askNobody") : t("blocked.ask", { count: notice.owners.length })}
				</p>
				{notice.owners.length > 0 && (
					<ul className="flex flex-col gap-1 text-sm">
						{notice.owners.map((owner) => (
							<li key={owner.id}>
								<a
									href={`https://discord.com/users/${owner.id}`}
									target="_blank"
									rel="noreferrer"
									className="text-accent underline underline-offset-4"
								>
									{owner.name}
								</a>
							</li>
						))}
					</ul>
				)}
			</section>

			<DataTab />
		</PublicPage>
	);
}
