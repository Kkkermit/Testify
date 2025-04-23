document.addEventListener("DOMContentLoaded", function () {
	const sidebar = document.querySelector(".sidebar");
	const sidebarToggle = document.getElementById("sidebar-toggle");
	const sidebarOverlay = document.getElementById("sidebar-overlay");
	const sidebarLinks = document.querySelectorAll(".sidebar-link");
	const mainContent = document.querySelector(".main-content");
	const contentSections = document.querySelectorAll(".content-section");
	const navbar = document.querySelector(".navbar");
	const logoContainer = document.getElementById("logo-container");

	logoContainer.addEventListener("click", function () {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	});

	document.querySelectorAll(".content-section h2").forEach((heading, index) => {
		heading.classList.add("animate__animated", "animate__fadeInLeft");
		heading.style.animationDelay = `${index * 0.1}s`;
	});

	document.querySelectorAll(".support-item i, .hero-image").forEach((el) => {
		el.classList.add("float-animation");
	});

	sidebarToggle.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		toggleSidebar();
	});

	sidebarOverlay.addEventListener("click", function (e) {
		e.preventDefault();
		closeSidebar();
	});

	sidebarLinks.forEach((link) => {
		link.addEventListener("click", function (e) {
			const parentItem = this.closest(".sidebar-item");
			const sublist = parentItem ? parentItem.querySelector(".sidebar-sublist") : null;
			const toggleIcon = this.querySelector(".toggle-icon");

			if (toggleIcon && (e.target === toggleIcon || toggleIcon.contains(e.target))) {
				e.preventDefault();
				e.stopPropagation();

				if (sublist) {
					if (sublist.style.display === "none") {
						sublist.style.display = "block";
						toggleIcon.querySelector(".fas").classList.replace("fa-chevron-down", "fa-chevron-up");
					} else {
						sublist.style.display = "none";
						toggleIcon.querySelector(".fas").classList.replace("fa-chevron-up", "fa-chevron-down");
					}
				}
			} else {
				if (window.innerWidth <= 768) {
					setTimeout(() => {
						closeSidebar();
					}, 50);
				}
			}
		});
	});

	function toggleSidebar() {
		const isOpen = sidebar.classList.contains("active");

		if (isOpen) {
			closeSidebar();
		} else {
			openSidebar();
		}
	}

	function openSidebar() {
		sidebar.classList.add("active");
		sidebarOverlay.classList.add("active");
		sidebarToggle.innerHTML = '<i class="fas fa-times"></i>';
	}

	function closeSidebar() {
		sidebar.classList.remove("active");
		sidebarOverlay.classList.remove("active");
		sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
	}

	function handleResponsiveLayout() {
		if (window.innerWidth <= 768) {
			sidebar.classList.remove("active");
			sidebarOverlay.classList.remove("active");
			mainContent.style.marginLeft = "0";

			sidebarToggle.style.display = "flex";
		} else {
			mainContent.style.marginLeft = "var(--sidebar-width)";

			sidebar.style.transform = "none";
			sidebar.style.display = "block";

			sidebarToggle.style.display = "none";
		}
	}

	window.addEventListener("resize", handleResponsiveLayout);
	window.addEventListener("load", handleResponsiveLayout);
	handleResponsiveLayout();

	function highlightActiveSection() {
		const scrollY = window.scrollY;

		contentSections.forEach((section) => {
			const sectionTop = section.offsetTop - navbar.offsetHeight - 20;
			const sectionHeight = section.offsetHeight;
			const sectionId = section.getAttribute("id");

			if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
				sidebarLinks.forEach((link) => {
					link.classList.remove("active");
					link.style.backgroundColor = "";
					link.style.color = "";
					link.style.borderRight = "";
				});

				const activeLink = document.querySelector(`.sidebar-link[href="#${sectionId}"]`);
				if (activeLink) {
					activeLink.classList.add("active");
					activeLink.style.backgroundColor = "var(--color-gray)";
					activeLink.style.color = "#8a2be2";
					activeLink.style.borderRight = "3px solid #8a2be2";

					const parentItem = activeLink.closest(".sidebar-sublist")?.closest(".sidebar-item");
					if (parentItem) {
						const parentLink = parentItem.querySelector(".sidebar-link");
						parentLink.classList.add("active");
						parentLink.style.backgroundColor = "var(--color-gray)";
						parentLink.style.color = "#8a2be2";
						parentLink.style.borderRight = "3px solid #8a2be2";
					}
				}
			}
		});
	}

	document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
		anchor.addEventListener("click", function (e) {
			e.preventDefault();
			const targetId = this.getAttribute("href").substring(1);
			if (targetId) {
				const targetElement = document.getElementById(targetId);
				if (targetElement) {
					targetElement.classList.add("animate__animated", "animate__pulse");
					setTimeout(() => {
						targetElement.classList.remove("animate__animated", "animate__pulse");
					}, 1000);

					window.scrollTo({
						top: targetElement.offsetTop - navbar.offsetHeight,
						behavior: "smooth",
					});
					history.pushState(null, null, `#${targetId}`);
				}
			}
		});
	});

	const sidebarItemsWithChildren = document.querySelectorAll(".sidebar-item");
	sidebarItemsWithChildren.forEach((item) => {
		const link = item.querySelector(".sidebar-link");
		const sublist = item.querySelector(".sidebar-sublist");

		if (sublist) {
			if (!link.querySelector(".toggle-icon")) {
				link.innerHTML += '<span class="toggle-icon ml-2"><i class="fas fa-chevron-down text-xs"></i></span>';
			}

			sublist.style.display = "none";

			sublist.querySelectorAll(".sidebar-link").forEach((childLink) => {
				childLink.addEventListener("click", function (e) {
					if (window.innerWidth <= 768) {
						setTimeout(() => {
							closeSidebar();
						}, 50);
					}
				});
			});
		}
	});

	document.querySelectorAll("pre").forEach((block) => {
		const copyButton = document.createElement("button");
		copyButton.className =
			"absolute right-3 top-3 bg-white/10 hover:bg-white/20 border-none rounded px-3 py-1 text-white cursor-pointer transition-all";
		copyButton.innerHTML = '<i class="fas fa-copy"></i>';
		copyButton.title = "Copy to clipboard";

		block.style.position = "relative";

		copyButton.addEventListener("click", () => {
			const code = block.textContent;
			navigator.clipboard.writeText(code).then(() => {
				copyButton.innerHTML = '<i class="fas fa-check"></i>';
				copyButton.classList.add("bg-green-500/20");
				setTimeout(() => {
					copyButton.innerHTML = '<i class="fas fa-copy"></i>';
					copyButton.classList.remove("bg-green-500/20");
				}, 2000);
			});
		});
		block.appendChild(copyButton);
	});

	const backToTopButton = document.createElement("button");
	backToTopButton.id = "back-to-top";
	backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
	backToTopButton.title = "Back to top";
	backToTopButton.className =
		"fixed bottom-5 right-5 bg-primary hover:bg-primary-light text-white border-none rounded-full w-12 h-12 flex items-center justify-center cursor-pointer shadow-md transition-all duration-300 opacity-0 z-50";
	document.body.appendChild(backToTopButton);

	window.addEventListener("scroll", () => {
		if (window.scrollY > 500) {
			backToTopButton.style.opacity = "1";
			backToTopButton.style.transform = "translateY(0)";
		} else {
			backToTopButton.style.opacity = "0";
			backToTopButton.style.transform = "translateY(20px)";
		}
	});

	backToTopButton.addEventListener("click", () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	});

	const themeToggle = document.createElement("button");
	themeToggle.id = "theme-toggle";
	themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
	themeToggle.title = "Toggle dark/light mode";
	themeToggle.className =
		"fixed bottom-5 left-5 bg-primary hover:bg-primary-light text-white border-none rounded-full w-12 h-12 flex items-center justify-center cursor-pointer shadow-md transition-all duration-300 z-50";
	document.body.appendChild(themeToggle);

	const savedTheme = localStorage.getItem("theme");
	if (savedTheme === "light") {
		document.documentElement.classList.add("light-mode");
		document.documentElement.classList.remove("dark-mode");
		themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
	} else {
		document.documentElement.classList.add("dark-mode");
		document.documentElement.classList.remove("light-mode");
	}

	themeToggle.addEventListener("click", () => {
		document.documentElement.style.transition = "background-color 0.5s ease, color 0.5s ease";

		if (document.documentElement.classList.contains("dark-mode")) {
			document.documentElement.classList.remove("dark-mode");
			document.documentElement.classList.add("light-mode");
			themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
			localStorage.setItem("theme", "light");
			updateStarHistoryChart('light');
		} else {
			document.documentElement.classList.remove("light-mode");
			document.documentElement.classList.add("dark-mode");
			themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
			localStorage.setItem("theme", "dark");
			updateStarHistoryChart('dark');
		}

		setTimeout(() => {
			document.documentElement.style.transition = "";
		}, 500);
	});

	function updateStarHistoryChart(theme) {
		const starHistoryImg = document.querySelector('.star-history-chart img');
		if (starHistoryImg) {
			const baseUrl = 'https://api.star-history.com/svg?repos=Kkkermit/Testify&type=Date';
			starHistoryImg.src = theme === 'light' ? 
				`${baseUrl}` : 
				`${baseUrl}&theme=dark`;
		}
	}

	const currentTheme = localStorage.getItem('theme') || 'dark';
	updateStarHistoryChart(currentTheme === 'light' ? 'light' : 'dark');

	function fetchGitHubStats() {
		const repoPath = "Kkkermit/Testify";
		const statsContainer = document.querySelector(".stats-badges");

		if (!statsContainer) return;

		statsContainer.innerHTML = `
            <div class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md">
                <i class="fas fa-star text-yellow-400 mr-2"></i>
                <span class="text-white">Stars: <span class="font-bold"><i class="fas fa-spinner fa-spin"></i></span></span>
            </div>
            <div class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md">
                <i class="fas fa-code-branch text-blue-400 mr-2"></i>
                <span class="text-white">Forks: <span class="font-bold"><i class="fas fa-spinner fa-spin"></i></span></span>
            </div>
            <div class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md">
                <i class="fas fa-exclamation-circle text-red-400 mr-2"></i>
                <span class="text-white">Issues: <span class="font-bold"><i class="fas fa-spinner fa-spin"></i></span></span>
            </div>
        `;

		fetch(`https://api.github.com/repos/${repoPath}`)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`GitHub API returned ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				const formatNumber = (num) => {
					if (num >= 1000) {
						return (num / 1000).toFixed(1) + "k";
					}
					return num;
				};

				const stars = formatNumber(data.stargazers_count);
				const forks = formatNumber(data.forks_count);
				const openIssues = formatNumber(data.open_issues_count);

				statsContainer.innerHTML = `
                    <a href="https://github.com/${repoPath}/stargazers" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-star text-yellow-400 mr-2"></i>
                        <span class="text-white">Stars: <span class="font-bold">${stars}</span></span>
                    </a>
                    <a href="https://github.com/${repoPath}/network/members" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-code-branch text-blue-400 mr-2"></i>
                        <span class="text-white">Forks: <span class="font-bold">${forks}</span></span>
                    </a>
                    <a href="https://github.com/${repoPath}/issues" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-exclamation-circle text-red-400 mr-2"></i>
                        <span class="text-white">Issues: <span class="font-bold">${openIssues}</span></span>
                    </a>
                `;
			})
			.catch((error) => {
				console.error("Error fetching GitHub stats:", error);

				statsContainer.innerHTML = `
                    <a href="https://github.com/${repoPath}/stargazers" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-star text-yellow-400 mr-2"></i>
                        <span class="text-white">Stars</span>
                    </a>
                    <a href="https://github.com/${repoPath}/network/members" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-code-branch text-blue-400 mr-2"></i>
                        <span class="text-white">Forks</span>
                    </a>
                    <a href="https://github.com/${repoPath}/issues" target="_blank" class="stats-badge flex items-center bg-dark px-3 py-2 rounded-md hover:bg-dark-light/70 transition-all">
                        <i class="fas fa-exclamation-circle text-red-400 mr-2"></i>
                        <span class="text-white">Issues</span>
                    </a>
                `;
			});
	}

	fetchGitHubStats();

	function fetchGitHubContributors() {
		const repoPath = "Kkkermit/Testify";
		const contributorsContainer = document.querySelector(".contributors-container");

		if (!contributorsContainer) return;

		fetch(`https://api.github.com/repos/${repoPath}/contributors?per_page=10`)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`GitHub API returned ${response.status}`);
				}
				return response.json();
			})
			.then((contributors) => {
				if (contributors.length === 0) {
					contributorsContainer.innerHTML = `<p class="text-white">No contributors found.</p>`;
					return;
				}

				let contributorsHTML = "";
				contributors.forEach((contributor) => {
					contributorsHTML += `
						<a href="${contributor.html_url}" target="_blank" 
						   class="contributor-item flex flex-col items-center p-3 hover:bg-dark/50 rounded-lg transition-all duration-200 transform hover:scale-105">
							<img src="${contributor.avatar_url}" alt="${contributor.login}" 
								 class="w-16 h-16 rounded-full mb-2 border-2 border-primary shadow-md">
							<span class="text-white text-sm font-medium">${contributor.login}</span>
							<span class="text-gray-400 text-xs">${contributor.contributions} commits</span>
						</a>
					`;
				});

				contributorsContainer.innerHTML = contributorsHTML;
			})
			.catch((error) => {
				console.error("Error fetching GitHub contributors:", error);
				contributorsContainer.innerHTML = `
					<p class="text-white">Failed to load contributors. <a href="https://github.com/${repoPath}/graphs/contributors" 
					   target="_blank" class="text-primary hover:underline">View on GitHub</a></p>
				`;
			});
	}

	fetchGitHubContributors();

	highlightActiveSection();

	window.addEventListener(
		"scroll",
		debounce(function () {
			highlightActiveSection();

			document.querySelectorAll(".content-section:not(.animate__animated)").forEach((section) => {
				const sectionTop = section.getBoundingClientRect().top;
				const windowHeight = window.innerHeight;

				if (sectionTop < windowHeight * 0.75) {
					section.classList.add("animate__animated", "animate__fadeIn");
				}
			});
		}, 100),
	);

	if (window.location.hash) {
		setTimeout(() => {
			const id = window.location.hash.substring(1);
			const element = document.getElementById(id);
			if (element) {
				element.scrollIntoView({
					behavior: "smooth",
					block: "start",
					inline: "nearest",
				});
				window.scrollBy(0, -navbar.offsetHeight - 10);
			}
		}, 500);
	}

	function debounce(func, wait) {
		let timeout;
		return function () {
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(context, args);
			}, wait);
		};
	}
});
