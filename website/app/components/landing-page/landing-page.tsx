import React from "react";
import ParticleBackground from "../background/particle-background";
import HeroSection from "./hero-section/hero";
import "../../styles/index.css";

const LandingPage: React.FC = () => {
	return (
		<div className="relative min-h-screen overflow-hidden">
			<ParticleBackground />
			<HeroSection />
		</div>
	);
};

export default LandingPage;
