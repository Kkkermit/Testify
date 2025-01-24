export const fetchBotStats = async () => {
	const response = await fetch("http://localhost:3001/api/stats");
	return await response.json();
};

export const fetchBotInfo = async () => {
	const response = await fetch("http://localhost:3001/api/bot");
	return await response.json();
};
