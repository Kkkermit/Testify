export const fetchGitHubVersion = async () => {
	try {
		const response = await fetch("https://api.github.com/repos/Kkkermit/Testify/releases/latest");
		const data = await response.json();
		return data.tag_name || "1.0.0";
	} catch (error) {
		console.error("Failed to fetch GitHub version:", error);
		return "1.0.0";
	}
};
