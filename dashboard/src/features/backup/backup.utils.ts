/** A file name from the server's name and the day, keeping only what every file system accepts. */
export function backupFileName(guildName: string, now = new Date()): string {
	const slug =
		guildName
			.normalize("NFKD")
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.toLowerCase()
			.slice(0, 40) || "server";
	return `${slug}-settings-${now.toISOString().slice(0, 10)}.json`;
}

export function saveFile(name: string, text: string): void {
	const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}
