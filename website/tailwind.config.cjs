module.exports = {
	content: ["./index.html", "./app/**/*.{vue,js,ts,jsx,tsx}"],
	media: false,
	theme: {
		extend: {
			width: {
				"400px": "400px",
			},
			animation: {
				"fade-in-up": "fade-in-up 1s ease-out",
				"fade-in": "fadeIn 0.5s ease-in",
				"fade-in-up": "fadeInUp 1s ease-out",
				pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				fadeInUp: {
					"0%": { opacity: "0", transform: "translateY(20px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
		},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
