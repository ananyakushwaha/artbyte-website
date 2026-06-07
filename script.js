const canvas = document.querySelector("#neuralCanvas");
const ctx = canvas.getContext("2d");
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const magneticItems = document.querySelectorAll(".magnetic");
const themeButtons = document.querySelectorAll(".theme-button");
const themes = ["", "theme-mint", "theme-ember", "theme-violet"];
const themeLabels = ["Colors Off", "Mint Glow", "Ember Glow", "Violet Glow"];
let activeThemeIndex = 0;
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

const pointer = {
  targetX: window.innerWidth / 2,
  targetY: window.innerHeight / 2,
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  dotX: window.innerWidth / 2,
  dotY: window.innerHeight / 2,
  ringX: window.innerWidth / 2,
  ringY: window.innerHeight / 2,
  clickX: window.innerWidth / 2,
  clickY: window.innerHeight / 2,
  clickPower: 0,
};

let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let deviceScale = 1;
let themeLineRgb = "67, 245, 255";
let networkFrameId = 0;
let lastNetworkTick = performance.now();

function updatePointerPosition(event) {
  pointer.targetX = event.clientX;
  pointer.targetY = event.clientY;
}

function getThemeRgb(name) {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  const hex = value.replace("#", "");
  if (hex.length !== 6) return "67, 245, 255";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function refreshThemeColor() {
  themeLineRgb = getThemeRgb("--cyan");
}

function paintThemeButtons() {
  const isColorTheme = activeThemeIndex > 0;
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(isColorTheme));
    const label = button.querySelector(".theme-button-label");
    if (label) {
      label.textContent = themeLabels[activeThemeIndex];
    } else {
      button.textContent = themeLabels[activeThemeIndex];
    }
  });
}

function saveThemeIndex(index) {
  try {
    localStorage.setItem("artbyte-theme-index", String(index));
  } catch (error) {
    // Theme switching should still work if storage is unavailable.
  }
}

function readThemeIndex() {
  try {
    return Number(localStorage.getItem("artbyte-theme-index"));
  } catch (error) {
    return Number.NaN;
  }
}

function applyTheme(index) {
  document.body.classList.remove(...themes.filter(Boolean));
  activeThemeIndex = index;
  if (themes[activeThemeIndex]) {
    document.body.classList.add(themes[activeThemeIndex]);
  }
  saveThemeIndex(activeThemeIndex);
  refreshThemeColor();
  paintThemeButtons();
}

function resizeCanvas() {
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.floor(canvasWidth * deviceScale);
  canvas.height = Math.floor(canvasHeight * deviceScale);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  const isSmallScreen = canvasWidth < 620;
  const targetCount = isSmallScreen
    ? Math.min(110, Math.max(58, Math.floor(canvasWidth * canvasHeight / 10000)))
    : Math.min(220, Math.max(96, Math.floor(canvasWidth * canvasHeight / 7600)));
  particles = Array.from({ length: targetCount }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.48,
    vy: (Math.random() - 0.5) * 0.48,
    r: Math.random() * 1.9 + 0.85,
  }));
}

function switchTheme() {
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  applyTheme((activeThemeIndex + 1) % themes.length);
  pointer.x = pointer.targetX;
  pointer.y = pointer.targetY;
  pointer.dotX = pointer.targetX;
  pointer.dotY = pointer.targetY;
  pointer.ringX = pointer.targetX;
  pointer.ringY = pointer.targetY;
  pointer.clickPower = 1.25;
  if (cursorDot && cursorRing) {
    cursorDot.style.opacity = "1";
    cursorRing.style.opacity = "1";
  }
  wakeNetwork();
}

function isInteractiveTap(target) {
  return Boolean(target.closest?.("a, button, input, textarea, select, .site-nav"));
}

function handlePossibleDoubleTap(event) {
  if (event.pointerType !== "touch") return;
  if (isInteractiveTap(event.target)) return;

  const now = Date.now();
  const travel = Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY);
  const isDoubleTap = now - lastTapTime < 340 && travel < 36;

  lastTapTime = now;
  lastTapX = event.clientX;
  lastTapY = event.clientY;

  if (isDoubleTap) {
    event.preventDefault();
    switchTheme();
    lastTapTime = 0;
  }
}

function animateCursor() {
  pointer.dotX += (pointer.targetX - pointer.dotX) * 0.74;
  pointer.dotY += (pointer.targetY - pointer.dotY) * 0.74;
  pointer.ringX += (pointer.targetX - pointer.ringX) * 0.16;
  pointer.ringY += (pointer.targetY - pointer.ringY) * 0.16;

  if (cursorDot && cursorRing && window.matchMedia("(pointer: fine)").matches) {
    cursorDot.style.transform = `translate3d(${pointer.dotX}px, ${pointer.dotY}px, 0) translate(-50%, -50%)`;
    cursorRing.style.transform = `translate3d(${pointer.ringX}px, ${pointer.ringY}px, 0) translate(-50%, -50%)`;
  }

  requestAnimationFrame(animateCursor);
}

function drawNetwork() {
  try {
    lastNetworkTick = performance.now();
    window.__artbyteConstellationFrames = (window.__artbyteConstellationFrames || 0) + 1;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    pointer.clickPower *= 0.94;
    pointer.x += (pointer.targetX - pointer.x) * 0.28;
    pointer.y += (pointer.targetY - pointer.y) * 0.28;

    particles.forEach((particle, index) => {
      const dx = pointer.x - particle.x;
      const dy = pointer.y - particle.y;
      const distance = Math.hypot(dx, dy);
      const clickDx = pointer.clickX - particle.x;
      const clickDy = pointer.clickY - particle.y;
      const clickDistance = Math.hypot(clickDx, clickDy);

      if (distance < 160) {
        particle.vx -= dx * 0.000018;
        particle.vy -= dy * 0.000018;
      }

      if (pointer.clickPower > 0.01 && clickDistance < 360) {
        const force = (1 - clickDistance / 360) * pointer.clickPower;
        particle.vx += clickDx * force * 0.00042;
        particle.vy += clickDy * force * 0.00042;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.992;
      particle.vy *= 0.992;

      if (particle.x < -20) particle.x = canvasWidth + 20;
      if (particle.x > canvasWidth + 20) particle.x = -20;
      if (particle.y < -20) particle.y = canvasHeight + 20;
      if (particle.y > canvasHeight + 20) particle.y = -20;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();

      for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
        const next = particles[nextIndex];
        const linkDistance = Math.hypot(particle.x - next.x, particle.y - next.y);
        const cursorGlow = Math.max(0, 1 - Math.hypot((particle.x + next.x) / 2 - pointer.x, (particle.y + next.y) / 2 - pointer.y) / 220);
        const clickGlow = Math.max(0, 1 - Math.hypot((particle.x + next.x) / 2 - pointer.clickX, (particle.y + next.y) / 2 - pointer.clickY) / 390) * pointer.clickPower;
      const linkLimit = (canvasWidth < 620 ? 132 : 176) + clickGlow * 250 + cursorGlow * 86;

        if (linkDistance < linkLimit) {
          const alpha = 1 - linkDistance / linkLimit;
          const hot = Math.min(0.98, alpha * (0.34 + cursorGlow * 0.52 + clickGlow * 0.95));
          ctx.strokeStyle = `rgba(${clickGlow > 0.2 ? "255, 255, 255" : themeLineRgb}, ${hot})`;
          ctx.lineWidth = 1 + cursorGlow * 0.5 + clickGlow * 0.8;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      }
    });

    if (pointer.clickPower > 0.02) {
      const radius = (1 - pointer.clickPower) * 310 + 26;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pointer.clickPower * 0.34})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.clickX, pointer.clickY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  } catch (error) {
    console.warn("Constellation frame skipped", error);
  } finally {
    networkFrameId = requestAnimationFrame(drawNetwork);
  }
}

function wakeNetwork() {
  if (networkFrameId) {
    cancelAnimationFrame(networkFrameId);
  }
  networkFrameId = requestAnimationFrame(drawNetwork);
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("pointermove", updatePointerPosition, { passive: true });
window.addEventListener("mousemove", updatePointerPosition, { passive: true });
window.addEventListener("pointerenter", updatePointerPosition, { passive: true });

window.addEventListener("pointerdown", (event) => {
  pointer.targetX = event.clientX;
  pointer.targetY = event.clientY;
  pointer.clickX = event.clientX;
  pointer.clickY = event.clientY;
  pointer.clickPower = 1;
  handlePossibleDoubleTap(event);
});

window.addEventListener("dblclick", () => {
  switchTheme();
});

themeButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    switchTheme();
  });
});

magneticItems.forEach((item) => {
  item.addEventListener("mouseenter", () => document.body.classList.add("cursor-active"));
  item.addEventListener("mouseleave", () => {
    document.body.classList.remove("cursor-active");
    item.style.transform = "";
  });
  item.addEventListener("mousemove", (event) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (item.classList.contains("theme-button-top") && window.matchMedia("(max-width: 940px)").matches) return;
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
  });
});

navToggle.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  });
});

function setFormStatus(form, message, type = "") {
  const status = form.querySelector(".form-status");
  if (!status) return;
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

async function submitWebsiteForm(form) {
  const formType = form.dataset.form;
  const endpoint = formType === "newsletter" ? "/api/newsletter" : "/api/contact";
  const submitButton = form.querySelector("button[type='submit']");
  const payload = Object.fromEntries(new FormData(form).entries());

  setFormStatus(form, "Sending...");
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Backend is not running. Open the site through the Node/Vercel server, not Live Server.");
      }
      throw new Error(result.message || "Something went wrong. Please try again.");
    }

    form.reset();
    setFormStatus(form, result.message || "Submitted successfully.", "success");
  } catch (error) {
    setFormStatus(form, error.message || "Unable to send right now. Please email us directly.", "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitWebsiteForm(form);
  });
});

const savedThemeIndex = readThemeIndex();
if (Number.isInteger(savedThemeIndex) && savedThemeIndex >= 0 && savedThemeIndex < themes.length) {
  activeThemeIndex = savedThemeIndex;
}
applyTheme(activeThemeIndex);
resizeCanvas();
animateCursor();
wakeNetwork();

setInterval(() => {
  if (performance.now() - lastNetworkTick > 350) {
    wakeNetwork();
  }
}, 500);
