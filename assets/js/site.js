(function () {
  "use strict";

  const bootScreen = document.getElementById("bootScreen");
  const bootBody = document.getElementById("bootBody");
  const bootHint = document.getElementById("bootHint");
  const desktop = document.getElementById("desktop");

  const mainWindow = document.getElementById("mainWindow");
  const mainWindowTopbar = mainWindow ? mainWindow.querySelector(".window-topbar") : null;
  const closeWindow = document.getElementById("closeWindow");
  const minimizeWindow = document.getElementById("minimizeWindow");
  const maximizeWindow = document.getElementById("maximizeWindow");

  const commandForm = document.getElementById("commandForm");
  const commandInput = document.getElementById("commandInput");
  const commandFeedback = document.getElementById("commandFeedback");
  const commandGrid = document.getElementById("commandGrid");
  const activeTitle = document.getElementById("activeTitle");
  const contentMain = document.querySelector(".content-main");

  const projectsList = document.getElementById("projectsList");
  const projectModal = document.getElementById("projectModal");
  const projectModalClose = document.getElementById("projectModalClose");
  const projectModalPath = document.getElementById("projectModalPath");
  const projectModalTitle = document.getElementById("projectModalTitle");
  const projectModalDescription = document.getElementById("projectModalDescription");
  const projectModalImage = document.getElementById("projectModalImage");
  const projectModalLanguage = document.getElementById("projectModalLanguage");
  const projectModalStack = document.getElementById("projectModalStack");
  const projectModalUpdated = document.getElementById("projectModalUpdated");
  const projectModalStars = document.getElementById("projectModalStars");
  const projectModalRepo = document.getElementById("projectModalRepo");
  const projectModalHome = document.getElementById("projectModalHome");

  const exitScreen = document.getElementById("exitScreen");
  const reopenWindow = document.getElementById("reopenWindow");

  if (!bootScreen || !desktop || !commandInput) {
    return;
  }

  const sections = Array.from(document.querySelectorAll(".terminal-section"));
  const sectionMap = {};
  sections.forEach((section) => {
    const key = section.getAttribute("data-section");
    if (key) {
      sectionMap[key] = section;
    }
  });

  const bootLines = [
    { text: "Last login: " + new Date().toLocaleString() + " on ttys000", tone: "" },
    { text: "Launching portfolio terminal...", tone: "" },
    { text: "Loading timeline...", tone: "" },
    { text: "Loading projects...", tone: "" },
    { text: "Loading contact links...", tone: "" },
    { text: "[ok] ready.", tone: "ok" }
  ];

  const aliases = {
    about: "overview",
    overview: "overview",
    timeline: "timeline",
    activities: "experience",
    experience: "experience",
    education: "education",
    projects: "projects",
    work: "projects",
    skills: "skills",
    courses: "courses",
    awards: "awards",
    contact: "contact"
  };

  const fallbackProjects = [
    {
      name: "Timely Fitness",
      description: "Android app for workout tracking and reminders.",
      detail:
        "Timely Fitness is an Android app focused on simple workout logging and reminders to stay consistent.",
      language: "Java",
      stack: "Android, Java",
      stars: 0,
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://github.com/ArticsData/Timely-Fitness",
      homepage: "",
      image: "images/timely_fitness_logo.png"
    },
    {
      name: "Exacto GPS",
      description: "Android utility app for practical GPS workflows.",
      detail:
        "Exacto GPS is a lightweight Android utility app for quick and reliable location checks.",
      language: "Java",
      stack: "Android, Java",
      stars: 0,
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://github.com/ArticsData/Exacto-GPS",
      homepage: "",
      image: "images/exacto_gps_logo.png"
    },
    {
      name: "Shift Calendar",
      description: "Android app for recurring shift schedules.",
      detail:
        "Shift Calendar is an Android scheduling app for recurring shifts and rotation-heavy calendars.",
      language: "Java",
      stack: "Android, Java",
      stars: 0,
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://github.com/ArticsData/Shift-Calendar",
      homepage: "",
      image: "images/shift_calendar_logo.png"
    },
    {
      name: "Library Search Tool",
      description: "Python crawler for local library listings.",
      detail:
        "Python class project that crawls local library catalogs and aggregates searchable book results.",
      language: "Python",
      stack: "Python, BeautifulSoup, Data Aggregation",
      stars: 0,
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://github.com/Anksharskarp/Python-Web-Crawler-Class-Course-Project",
      homepage: "",
      image: ""
    }
  ];

  let bootFinished = false;
  let bootSkipped = false;
  let projectsLoaded = false;
  let projectItems = [];
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let ensureMainWindowBounds = function () {};

  const PROJECT_CACHE_KEY = "portfolio.projects.cache.v1";
  const PROJECT_CACHE_TTL = 1000 * 60 * 60 * 8;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  function scrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function focusCommandInput() {
    try {
      commandInput.focus({ preventScroll: true });
    } catch (_) {
      commandInput.focus();
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setFeedback(message) {
    if (commandFeedback) {
      commandFeedback.textContent = message;
    }
  }

  function setupWindowDragging() {
    if (!mainWindow || !mainWindowTopbar) {
      return;
    }

    const viewportPadding = 8;
    let dragging = false;
    let pointerId = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startOffsetX = 0;
    let startOffsetY = 0;
    let startRect = null;
    let rafId = 0;
    let pendingOffsetX = 0;
    let pendingOffsetY = 0;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function applyPosition(offsetX, offsetY) {
      mainWindow.style.transform = "translate(" + offsetX + "px, " + offsetY + "px)";
    }

    function flushPosition() {
      rafId = 0;
      dragOffsetX = pendingOffsetX;
      dragOffsetY = pendingOffsetY;
      applyPosition(dragOffsetX, dragOffsetY);
    }

    function queuePosition(offsetX, offsetY) {
      pendingOffsetX = offsetX;
      pendingOffsetY = offsetY;
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(flushPosition);
    }

    function ensureWithinViewport() {
      if (desktop.classList.contains("hidden")) {
        return;
      }

      const rect = mainWindow.getBoundingClientRect();
      const minLeft = viewportPadding;
      const maxLeft = Math.max(minLeft, window.innerWidth - rect.width - viewportPadding);
      const minTop = viewportPadding;
      const maxTop = Math.max(minTop, window.innerHeight - rect.height - viewportPadding);

      const clampedLeft = clamp(rect.left, minLeft, maxLeft);
      const clampedTop = clamp(rect.top, minTop, maxTop);

      if (Math.abs(clampedLeft - rect.left) < 0.5 && Math.abs(clampedTop - rect.top) < 0.5) {
        return;
      }

      queuePosition(
        dragOffsetX + (clampedLeft - rect.left),
        dragOffsetY + (clampedTop - rect.top)
      );
    }

    ensureMainWindowBounds = ensureWithinViewport;

    function stopDragging() {
      if (!dragging) {
        return;
      }
      const capturedPointer = pointerId;
      dragging = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      dragOffsetX = pendingOffsetX;
      dragOffsetY = pendingOffsetY;
      applyPosition(dragOffsetX, dragOffsetY);
      ensureWithinViewport();
      document.body.classList.remove("dragging-window");
      mainWindowTopbar.classList.remove("is-grabbing");
      mainWindow.classList.remove("is-dragging");
      try {
        if (capturedPointer !== null) {
          mainWindowTopbar.releasePointerCapture(capturedPointer);
        }
      } catch (_) {
        // Ignore pointer release errors.
      }
      pointerId = null;
    }

    mainWindowTopbar.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      if (event.target && event.target.closest("button, a, input, textarea, select")) {
        return;
      }

      dragging = true;
      pointerId = event.pointerId;
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startOffsetX = dragOffsetX;
      startOffsetY = dragOffsetY;
      startRect = mainWindow.getBoundingClientRect();
      pendingOffsetX = dragOffsetX;
      pendingOffsetY = dragOffsetY;

      document.body.classList.add("dragging-window");
      mainWindowTopbar.classList.add("is-grabbing");
      mainWindow.classList.add("is-dragging");
      mainWindowTopbar.setPointerCapture(pointerId);
      event.preventDefault();
    });

    mainWindowTopbar.addEventListener("pointermove", function (event) {
      if (!dragging || event.pointerId !== pointerId || !startRect) {
        return;
      }

      const dx = event.clientX - startPointerX;
      const dy = event.clientY - startPointerY;

      const proposedLeft = startRect.left + dx;
      const proposedTop = startRect.top + dy;
      const minLeft = viewportPadding;
      const maxLeft = Math.max(minLeft, window.innerWidth - startRect.width - viewportPadding);
      const minTop = viewportPadding;
      const maxTop = Math.max(minTop, window.innerHeight - startRect.height - viewportPadding);

      const clampedLeft = clamp(proposedLeft, minLeft, maxLeft);
      const clampedTop = clamp(proposedTop, minTop, maxTop);

      queuePosition(
        startOffsetX + (clampedLeft - startRect.left),
        startOffsetY + (clampedTop - startRect.top)
      );
    });

    mainWindowTopbar.addEventListener("pointerup", stopDragging);
    mainWindowTopbar.addEventListener("pointercancel", stopDragging);

    mainWindowTopbar.addEventListener("dblclick", function () {
      queuePosition(0, 0);
      dragOffsetX = 0;
      dragOffsetY = 0;
      window.requestAnimationFrame(ensureWithinViewport);
      setFeedback("window centered.");
    });

    window.addEventListener("resize", function () {
      ensureWithinViewport();
    });
  }

  function readProjectCache() {
    try {
      const raw = window.localStorage.getItem(PROJECT_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items) || typeof parsed.savedAt !== "number") {
        return null;
      }
      if (Date.now() - parsed.savedAt > PROJECT_CACHE_TTL) {
        return null;
      }
      return parsed.items;
    } catch (_) {
      return null;
    }
  }

  function writeProjectCache(items) {
    try {
      window.localStorage.setItem(
        PROJECT_CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          items: items
        })
      );
    } catch (_) {
      // Ignore quota and private mode failures.
    }
  }

  function formatDate(iso) {
    if (!iso) {
      return "Unknown";
    }
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) {
      return "Unknown";
    }
    return value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function closeProjectModal() {
    if (!projectModal) {
      return;
    }
    projectModal.classList.add("hidden");
    focusCommandInput();
  }

  function openProjectModal(project) {
    if (!projectModal || !project) {
      return;
    }

    projectModalTitle.textContent = project.name;
    projectModalDescription.textContent = project.detail || project.description || "No description provided.";
    projectModalPath.textContent = "project://" + project.name;
    projectModalLanguage.textContent = project.language || "Not specified";
    projectModalStack.textContent = project.stack || "Not specified";
    projectModalUpdated.textContent = formatDate(project.updatedAt);
    projectModalStars.textContent = String(project.stars || 0);
    projectModalRepo.href = project.url;

    if (project.image) {
      projectModalImage.src = project.image;
      projectModalImage.classList.remove("hidden");
    } else {
      projectModalImage.classList.add("hidden");
      projectModalImage.removeAttribute("src");
    }

    if (project.homepage) {
      projectModalHome.href = project.homepage;
      projectModalHome.classList.remove("hidden");
    } else {
      projectModalHome.classList.add("hidden");
      projectModalHome.removeAttribute("href");
    }

    projectModal.classList.remove("hidden");
  }

  function renderProjects(items) {
    if (!projectsList) {
      return;
    }

    projectsList.innerHTML = "";

    items.forEach((project, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "project-card";
      card.setAttribute("data-index", String(index));

      const title = document.createElement("h3");
      title.textContent = project.name;

      if (project.image) {
        const image = document.createElement("img");
        image.className = "project-card-image";
        image.src = project.image;
        image.alt = project.name + " logo";
        card.appendChild(image);
      }

      const description = document.createElement("p");
      description.textContent = project.description || "No description provided.";

      const mini = document.createElement("p");
      mini.className = "project-mini";
      mini.textContent = (project.language || "Unknown") + " | Updated " + formatDate(project.updatedAt);

      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(mini);
      projectsList.appendChild(card);
    });
  }

  function normalizeRepos(repos) {
    return repos
      .filter((repo) => !repo.fork)
      .filter((repo) => repo.name !== "Anksharskarp.github.io")
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 12)
      .map((repo) => ({
        name: repo.name,
        description: repo.description || "No description provided.",
        detail: repo.description || "No description provided.",
        language: repo.language || "Not specified",
        stack: repo.language || "Not specified",
        stars: repo.stargazers_count || 0,
        updatedAt: repo.pushed_at || repo.updated_at,
        url: repo.html_url,
        homepage: repo.homepage || "",
        image: ""
      }));
  }

  function mergeFeaturedAndRepos(repos) {
    const seen = new Set();
    const merged = [];

    fallbackProjects.forEach((project) => {
      const key = (project.url || project.name || "").toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(project);
      }
    });

    repos.forEach((project) => {
      const key = (project.url || project.name || "").toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(project);
      }
    });

    return merged;
  }

  async function loadProjects() {
    if (projectsLoaded) {
      return;
    }

    const cached = readProjectCache();
    if (cached && cached.length) {
      projectItems = cached;
      renderProjects(projectItems);
      projectsLoaded = true;
      return;
    }

    if (projectsList) {
      projectsList.innerHTML = "<p class=\"lead\">Loading projects from GitHub...</p>";
    }

    try {
      const response = await fetch("https://api.github.com/users/Anksharskarp/repos?per_page=60&sort=updated", {
        headers: { Accept: "application/vnd.github+json" }
      });

      if (!response.ok) {
        throw new Error("GitHub API returned " + response.status);
      }

      const repos = await response.json();
      const normalized = normalizeRepos(Array.isArray(repos) ? repos : []);
      projectItems = mergeFeaturedAndRepos(normalized);

      if (!projectItems.length) {
        throw new Error("No repositories found");
      }

      renderProjects(projectItems);
      writeProjectCache(projectItems);
      projectsLoaded = true;
    } catch (_) {
      projectItems = mergeFeaturedAndRepos([]);
      renderProjects(projectItems);
      projectsLoaded = true;
      setFeedback("using fallback project list (GitHub API unavailable).");
    }
  }

  async function typeLine(text, tone) {
    const line = document.createElement("p");
    line.className = "boot-line" + (tone ? " " + tone : "");
    bootBody.appendChild(line);

    if (!text) {
      line.innerHTML = "&nbsp;";
      return;
    }

    for (let i = 0; i < text.length; i += 1) {
      if (bootSkipped) {
        line.textContent = text;
        break;
      }
      line.textContent += text[i];
      await sleep(8 + Math.floor(Math.random() * 8));
    }
  }

  async function runBootSequence() {
    for (let i = 0; i < bootLines.length; i += 1) {
      const item = bootLines[i];
      await typeLine(item.text, item.tone);
      if (bootSkipped) {
        break;
      }
      await sleep(130);
    }

    bootFinished = true;
    bootHint.classList.remove("hidden");
  }

  function openDesktop() {
    bootScreen.classList.add("hidden");
    desktop.classList.remove("hidden");
    scrollToTop();
    window.requestAnimationFrame(ensureMainWindowBounds);
    focusCommandInput();
  }

  function finishBootNow() {
    if (bootFinished) {
      openDesktop();
      return;
    }

    bootSkipped = true;
    bootBody.innerHTML = "";

    bootLines.forEach((item) => {
      const line = document.createElement("p");
      line.className = "boot-line" + (item.tone ? " " + item.tone : "");
      line.textContent = item.text || " ";
      bootBody.appendChild(line);
    });

    bootFinished = true;
    openDesktop();
  }

  function activateSection(name) {
    const next = sectionMap[name];
    if (!next) {
      setFeedback("Unknown command. Use /help.");
      return false;
    }

    sections.forEach((section) => {
      section.classList.remove("active");
    });

    next.classList.add("active");
    if (contentMain) {
      contentMain.scrollTop = 0;
    }
    activeTitle.textContent = next.getAttribute("data-title") || name;
    setFeedback("opened /" + name);

    if (name === "projects") {
      loadProjects();
    }

    return true;
  }

  function closeMainWindow() {
    closeProjectModal();
    desktop.classList.add("hidden");
    exitScreen.classList.remove("hidden");
    scrollToTop();
  }

  function reopenMainWindow() {
    exitScreen.classList.add("hidden");
    desktop.classList.remove("hidden");
    scrollToTop();
    window.requestAnimationFrame(ensureMainWindowBounds);
    focusCommandInput();
    setFeedback("reopened terminal.");
  }

  function runCommand(raw) {
    const input = (raw || "").trim().toLowerCase();

    if (!input) {
      setFeedback("type /help for commands.");
      return;
    }

    const normalized = input.startsWith("/") ? input.slice(1) : input;

    if (normalized === "help") {
      setFeedback("commands: /about /timeline /activities /education /projects /skills /courses /awards /contact /close");
      return;
    }

    if (normalized === "close" || normalized === "exit") {
      closeMainWindow();
      return;
    }

    if (normalized === "clear") {
      setFeedback("cleared.");
      return;
    }

    const target = aliases[normalized];
    if (!target) {
      setFeedback("unknown command. use /help.");
      return;
    }

    activateSection(target);
  }

  closeWindow.addEventListener("click", closeMainWindow);

  minimizeWindow.addEventListener("click", function () {
    mainWindow.classList.toggle("is-minimized");
    window.requestAnimationFrame(ensureMainWindowBounds);
    setFeedback(mainWindow.classList.contains("is-minimized") ? "window minimized." : "window restored.");
  });

  maximizeWindow.addEventListener("click", function () {
    mainWindow.classList.toggle("is-maximized");
    window.requestAnimationFrame(ensureMainWindowBounds);
    setFeedback(mainWindow.classList.contains("is-maximized") ? "focus mode on." : "focus mode off.");
  });

  reopenWindow.addEventListener("click", reopenMainWindow);

  commandForm.addEventListener("submit", function (event) {
    event.preventDefault();
    runCommand(commandInput.value);
    commandInput.value = "";
  });

  commandGrid.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-command]");
    if (!button) {
      return;
    }
    runCommand(button.getAttribute("data-command"));
  });

  if (projectsList) {
    projectsList.addEventListener("click", function (event) {
      const button = event.target.closest("button.project-card");
      if (!button) {
        return;
      }
      const index = Number(button.getAttribute("data-index"));
      if (Number.isNaN(index) || index < 0 || index >= projectItems.length) {
        return;
      }
      openProjectModal(projectItems[index]);
    });
  }

  if (projectModalClose) {
    projectModalClose.addEventListener("click", closeProjectModal);
  }

  if (projectModal) {
    projectModal.addEventListener("click", function (event) {
      if (event.target === projectModal) {
        closeProjectModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!bootScreen.classList.contains("hidden")) {
      if (event.key === "Enter") {
        finishBootNow();
      }
      return;
    }

    if (event.key === "Escape") {
      if (projectModal && !projectModal.classList.contains("hidden")) {
        closeProjectModal();
        return;
      }
      if (!exitScreen.classList.contains("hidden")) {
        reopenMainWindow();
      }
    }
  });

  bootScreen.addEventListener("click", function () {
    finishBootNow();
  });

  window.addEventListener("pageshow", scrollToTop);

  scrollToTop();
  setupWindowDragging();
  runBootSequence();
})();
