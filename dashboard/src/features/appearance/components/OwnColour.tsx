import { Check } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { FIELD, LABEL } from "@/components/form/fieldStyles";
import { Button, SectionHeading } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { COLOUR_TEXT_MAX, parseColour, readHex, sanitiseColourText, toHex, toHslText, toRgbText } from "@/lib/colour";
import { CUSTOM_STARTING_POINT } from "@/lib/customAccent";

function Sample({ scheme, label }: { scheme: "light" | "dark"; label: string }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<figure
			data-scheme={scheme}
			data-accent="custom"
			className="bg-card text-foreground border-border rounded-field flex flex-col gap-3 border p-3"
		>
			<figcaption className="text-muted-foreground text-xs">{label}</figcaption>
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="bg-primary text-primary-foreground rounded-card px-3 py-1.5 font-medium">
					{t("appearance.ownButton")}
				</span>
				<span className="text-accent underline">{t("appearance.ownLink")}</span>
				<span className="bg-accent-wash text-accent rounded-full px-2 text-xs font-medium">
					{t("appearance.ownBadge")}
				</span>
			</div>
		</figure>
	);
}

export function OwnColour({
	colour,
	inUse,
	onUse,
}: {
	colour: string | null;
	inUse: boolean;
	onUse: (hex: string) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const id = useId();
	const [text, setText] = useState(colour ?? "");
	const [unreadable, setUnreadable] = useState(false);
	const typed = parseColour(text);
	const chosen = readHex(colour);

	const use = (hex: string): void => {
		setUnreadable(false);
		onUse(hex);
	};

	return (
		<form
			aria-labelledby={`${id}-heading`}
			className="border-border flex flex-col gap-4 border-t pt-4"
			onSubmit={(event) => {
				event.preventDefault();
				if (typed === null) setUnreadable(true);
				else use(toHex(typed));
			}}
		>
			<div className="flex flex-col gap-1">
				<SectionHeading as="h3" id={`${id}-heading`}>
					{t("appearance.ownTitle")}
					{inUse && (
						<span className="text-accent inline-flex items-center gap-1 text-xs font-medium">
							<Check size={13} aria-hidden="true" />
							{t("appearance.ownInUse")}
						</span>
					)}
				</SectionHeading>
				<p className="text-muted-foreground text-sm">{t("appearance.ownDescribes")}</p>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor={id} className={LABEL}>
					{t("appearance.ownField")}
				</label>
				<div className="flex flex-wrap gap-2">
					<input
						type="color"
						aria-label={t("appearance.ownPicker")}
						value={typed === null ? (colour ?? CUSTOM_STARTING_POINT) : toHex(typed)}
						onChange={(event) => {
							const picked = readHex(event.target.value);
							if (picked === null) return;
							setText(toHex(picked));
							use(toHex(picked));
						}}
						className={cn(FIELD, "h-10 w-14 shrink-0 p-1")}
					/>
					<input
						id={id}
						value={text}
						maxLength={COLOUR_TEXT_MAX}
						spellCheck={false}
						autoComplete="off"
						placeholder={CUSTOM_STARTING_POINT}
						aria-describedby={`${id}-formats`}
						aria-invalid={unreadable}
						onChange={(event) => {
							setText(sanitiseColourText(event.target.value));
							setUnreadable(false);
						}}
						onBlur={() => {
							setUnreadable(text.trim() !== "" && typed === null);
						}}
						className={cn(FIELD, "min-w-40 flex-1 font-mono", unreadable && "border-destructive")}
					/>
					<Button type="submit">{t("appearance.ownUse")}</Button>
				</div>
				<p id={`${id}-formats`} className="text-muted-foreground text-xs">
					{t("appearance.ownFormats")}
				</p>
				{unreadable && <Warning>{t("appearance.ownUnreadable")}</Warning>}
			</div>

			{chosen !== null && (
				<>
					<p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
						<span>{toHex(chosen)}</span>
						<span>{toRgbText(chosen)}</span>
						<span>{toHslText(chosen)}</span>
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<Sample scheme="light" label={t("appearance.light")} />
						<Sample scheme="dark" label={t("appearance.dark")} />
					</div>
					<p className="text-muted-foreground text-xs">{t("appearance.ownShades")}</p>
				</>
			)}
		</form>
	);
}
