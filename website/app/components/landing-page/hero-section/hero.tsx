import React, { useEffect, useState } from "react";
import { fetchBotStats } from "../../../utils/api";
import config from "../../../config/config";

interface BotStats {
	servers: number;
	users: number;
	lastUpdated: number;
}

const LoadingStats = () => (
	<div className="flex gap-8 justify-center mb-8 animate-pulse">
		<div className="text-white">
			<div className="h-8 w-20 bg-gray-700 rounded mb-2"></div>
			<span className="text-gray-400">Servers</span>
		</div>
		<div className="text-white">
			<div className="h-8 w-20 bg-gray-700 rounded mb-2"></div>
			<span className="text-gray-400">Users</span>
		</div>
	</div>
);

const HeroSection: React.FC = () => {
	const [stats, setStats] = useState<BotStats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadStats = async () => {
			try {
				const data = await fetchBotStats();
				// Only update stats if values are non-zero
				if (data.servers > 0 || data.users > 0) {
					setStats(data);
					setLoading(false);
				}
			} catch (error) {
				console.error("Failed to fetch stats:", error);
			}
		};

		loadStats();
		// Poll every 5 seconds until we get non-zero values
		const interval = setInterval(loadStats, 5000);
		return () => clearInterval(interval);
	}, []);

	// Show loading state if loading or if stats are zero/null
	const isLoading = loading || !stats || (stats.servers === 0 && stats.users === 0);

	return (
		<div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
			<div className="animate-fade-in-up">
				<h1 className="text-6xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
					{config.name}
				</h1>
				<p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
					Enhance your Discord server with powerful features and endless possibilities
				</p>

				{isLoading ? (
					<LoadingStats />
				) : (
					<div className="flex gap-8 justify-center mb-8 animate-fade-in">
						<div className="text-white">
							<span className="block text-2xl font-bold">{stats?.servers.toLocaleString()}</span>
							<span className="text-gray-400">Servers</span>
						</div>
						<div className="text-white">
							<span className="block text-2xl font-bold">{stats?.users.toLocaleString()}</span>
							<span className="text-gray-400">Users</span>
						</div>
					</div>
				)}

				<div className="flex gap-4 justify-center">
					<a
						href="#"
						className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all transform hover:scale-105"
					>
						Add to Discord
					</a>
					<a
						href="#"
						className="px-8 py-3 rounded-full bg-transparent border-2 border-blue-600 text-blue-400 hover:bg-blue-600/10 font-medium transition-all transform hover:scale-105"
					>
						Learn More
					</a>
				</div>
			</div>
		</div>
	);
};

export default HeroSection;
