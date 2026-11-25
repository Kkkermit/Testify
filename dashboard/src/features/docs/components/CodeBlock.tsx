import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { highlighted } from "@/lib/highlight";

export function CodeBlock({ code, language }: { code: string; language: string | undefined }): React.JSX.Element {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);

	return (
		<div className="relative min-w-0">
			<pre className="code-tokens bg-card border-border rounded-field overflow-x-auto border p-4 pr-12 font-mono text-[0.8125rem] leading-relaxed">
				<code>{highlighted(code, language)}</code>
			</pre>
			<button
				type="button"
				aria-label={copied ? t("docs.copied") : t("docs.copy")}
				onClick={() => {
					// Absent on a page served over plain HTTP from another machine, whatever the types say.
					if (!("clipboard" in navigator)) return;
					// A browser that refuses the write leaves the button as it was.
					void navigator.clipboard.writeText(code).then(
						() => {
							setCopied(true);
						},
						() => undefined,
					);
				}}
				className={cn(
					"text-muted-foreground hover:text-foreground hover:bg-muted rounded-chip absolute top-2 right-2",
					"flex size-8 items-center justify-center transition-colors duration-150",
					"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
				)}
			>
				{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
			</button>
		</div>
	);
}
