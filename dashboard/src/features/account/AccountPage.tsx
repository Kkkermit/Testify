import { AlarmClock, Database, History, Laptop, Palette, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Avatar, PageHeader, type TabDefinition, TabBar, TabContent } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { type AccountTab, accountTabFrom } from "@/features/account/account.utils";
import { DataTab } from "@/features/account/components/DataTab";
import { HistoryTab } from "@/features/account/components/HistoryTab";
import { ProfileTab } from "@/features/account/components/ProfileTab";
import { RemindersTab } from "@/features/account/components/RemindersTab";
import { SessionsTab } from "@/features/account/components/SessionsTab";
import { useMe } from "@/features/auth/useMe";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

const TABS: readonly TabDefinition<AccountTab>[] = [
	{ key: "profile", label: "account.tabProfile", icon: UserRound },
	{ key: "history", label: "account.tabHistory", icon: History },
	{ key: "reminders", label: "account.tabReminders", icon: AlarmClock },
	{ key: "sessions", label: "account.tabSessions", icon: Laptop },
	{ key: "data", label: "account.tabData", icon: Database },
];

const PANELS: Record<AccountTab, () => React.JSX.Element> = {
	profile: ProfileTab,
	history: HistoryTab,
	reminders: RemindersTab,
	sessions: SessionsTab,
	data: DataTab,
};

export function AccountPage(): React.JSX.Element {
	const { t } = useTranslation();
	const me = useMe();
	const [params, setParams] = useSearchParams();
	const tab = accountTabFrom(params.get("tab"));
	const Panel = PANELS[tab];
	const user = me.data?.user;

	usePageTitle(t("account.title"));

	return (
		<>
			<div className="flex items-center gap-4">
				{user !== undefined && <Avatar name={user.username} url={user.avatarUrl} size={56} seed={user.id} />}
				<div className="min-w-0 flex-1">
					<PageHeader
						title={t("account.title")}
						subtitle={user === undefined ? t("account.subtitle") : t("account.signedInAs", { name: user.username })}
						action={
							<Link
								to="/appearance"
								className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-1 text-sm")}
							>
								<Palette size={16} aria-hidden="true" /> {t("account.appearance")}
							</Link>
						}
					/>
				</div>
			</div>

			<TabBar
				label={t("account.tabsLabel")}
				tabs={TABS}
				active={tab}
				onSelect={(next) => {
					setParams(new URLSearchParams({ tab: next }));
				}}
			/>

			<TabContent label={t("account.tabsLabel")} active={tab} className="flex flex-col gap-4">
				<Panel />
			</TabContent>
		</>
	);
}
