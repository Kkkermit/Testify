import { type TestPost } from "@testify/shared";
import { Send } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Button } from "@/components/primitives";
import { sendTestStatus } from "@/features/test-post/testPost.utils";
import { useSendTest } from "@/features/test-post/useSendTest";
import { cn } from "@/lib/cn";

export function SendTest({ test }: { test: TestPost }): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const send = useSendTest(guildId);
	const statusId = useId();
	const blank = test.message.trim() === "";

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<Button
				variant="secondary"
				disabled={blank || send.isPending}
				aria-describedby={statusId}
				onClick={() => {
					send.mutate(test);
				}}
			>
				<Send size={15} aria-hidden="true" />
				{t("testPost.send")}
			</Button>
			<p id={statusId} role="status" className={cn("text-sm", send.isError ? "text-warning" : "text-muted-foreground")}>
				{sendTestStatus(send.status, send.error, t)}
			</p>
		</div>
	);
}
