"use strict";

const egg = document.getElementById("egg");
const stage = document.getElementById("stage");
const hint = document.getElementById("hint");

const bgm = document.getElementById("bgm");
const ding = document.getElementById("ding");
const pop = document.getElementById("pop");

const messages = [
  "you are an egg",
  "still an egg",
  "egg :3",
  "🥚",
  "loading shell…",
  "processing egg",
  "egg behavior detected",
  "you are an egg :3"
];

const spriteSources = [
  "assets/egg1.png",
  "assets/egg2.png",
  "assets/egg3.png",
  "assets/egg4.png"
];

// ---------- Preload sprites ----------
const preloadedSprites = [];
function preloadSprites(urls) {
  for (const url of urls) {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
    preloadedSprites.push(img);
  }
}
preloadSprites(spriteSources);

// ---------- Random SFX pool (AUTO via manifest.js + fallback) ----------
// manifest.js defines: window.SFX_FILES = ["bonk.mp3", "click.wav", ...]
const SFX_DIR = "assets/sfx/";

const SFX_FALLBACK = [
  `${SFX_DIR}sfx1.mp3`,
  `${SFX_DIR}sfx2.mp3`,
  `${SFX_DIR}sfx3.mp3`
];

let sfxSources = [...SFX_FALLBACK];

// If manifest.js loaded correctly, override sfxSources automatically.
if (Array.isArray(window.SFX_FILES) && window.SFX_FILES.length > 0) {
  sfxSources = window.SFX_FILES
    .map(f => String(f).trim())
    .filter(Boolean)
    .map(f => (f.startsWith("assets/") ? f : `${SFX_DIR}${f}`));
}

// Best-effort warm cache
function preloadAudioUrls(urls) {
  for (const url of urls) {
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
  }
}
preloadAudioUrls(sfxSources);

// Audio voice pool so SFX can overlap
const SFX_VOICES = 8;
const sfxVoices = Array.from({ length: SFX_VOICES }, () => new Audio());
let sfxVoiceIdx = 0;

let audioUnlocked = false;

function playRandomSfx(volume = 0.22) {
  if (!audioUnlocked) return;
  if (!sfxSources || sfxSources.length === 0) return;

  const url = sfxSources[Math.floor(Math.random() * sfxSources.length)];
  const voice = sfxVoices[sfxVoiceIdx];
  sfxVoiceIdx = (sfxVoiceIdx + 1) % sfxVoices.length;

  try {
    voice.pause();
    voice.currentTime = 0;
  } catch {}

  voice.src = url;
  voice.volume = volume;
  voice.play().catch(() => {});
}

// ---------- Audio unlock ----------
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  if (hint) hint.classList.add("hidden");

  if (bgm) {
    bgm.volume = 0.14;
    bgm.play().catch(() => {});
  }

  if (ding) {
    ding.volume = 0.25;
    try {
      ding.currentTime = 0;
      ding.play().catch(() => {});
    } catch {}
  }

  document.removeEventListener("click", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
}

document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);
let messageOverrideUntil = 0;
const CALM_MSG = "CALM DOWN WITH THE EGGING";
// ---------- Text behavior ----------
function setEggText(text) {
  // If override is active, force the calm message no matter what
  if (Date.now() < messageOverrideUntil) {
    text = CALM_MSG;
  }

  egg.classList.add("fade");
  window.setTimeout(() => {
    // Re-check at apply time too, in case the override started mid-fade
    const finalText = (Date.now() < messageOverrideUntil) ? CALM_MSG : text;

    egg.textContent = finalText;
    egg.classList.remove("fade");

    if (finalText === CALM_MSG) {
      egg.style.transform = "translate(-50%, -50%) scale(1.06)";
      setTimeout(() => (egg.style.transform = ""), 180);
    }
  }, 120);
}


function maybeMutateText() {
  if (Math.random() < 0.65) return;

  const msg = messages[Math.floor(Math.random() * messages.length)];
  setEggText(msg);

  if (audioUnlocked && Math.random() < 0.18 && ding) {
    try {
      ding.currentTime = 0;
      ding.volume = 0.22;
      ding.play().catch(() => {});
    } catch {}
  }

  if (audioUnlocked && Math.random() < 0.22) {
    playRandomSfx(0.18);
  }
}

window.setInterval(maybeMutateText, 3800);

// ---------- Tap-too-fast detector ----------
let tapTimes = [];
let calmDownCooldownUntil = 0;

function registerTapAndMaybeCalmDown() {
  const now = performance.now();

  tapTimes.push(now);
  tapTimes = tapTimes.filter(t => now - t < 1000);

  const tooFast = tapTimes.length >= 4;
	  if (tooFast && now > calmDownCooldownUntil) {
	  calmDownCooldownUntil = now + 2500;

	  // Force calm message for 5 seconds
	  messageOverrideUntil = Date.now() + 5000;

	  setEggText(CALM_MSG);
	  playRandomSfx(0.35);

	  // Optional: after override ends, reset to baseline
	  setTimeout(() => {
		if (Date.now() >= messageOverrideUntil) {
		  setEggText("you are an egg");
		}
	  }, 5100);

	  tapTimes = [];
	  return true;
  }
  return false;
}

// Clicking sometimes resets the text, but now also detects spam
document.addEventListener("click", () => {
  const wasCalmedDown = registerTapAndMaybeCalmDown();
  if (wasCalmedDown) return;

  if (Math.random() < 0.7) setEggText("you are an egg");
  if (Math.random() < 0.02) setEggText("would you like a brisket with eggs?");

  if (audioUnlocked && Math.random() < 0.12) {
    playRandomSfx(0.2);
  }
});

// Disable right click
document.addEventListener("contextmenu", (e) => e.preventDefault());

// ---------- Idle escalation ----------
let idleTimer = null;

function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    setEggText("hmm");
    setTimeout(() => setEggText("you are an egg"), 1100);
  }, 45000);
}

["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) => {
  document.addEventListener(evt, resetIdle, { passive: true });
});
resetIdle();

// ---------- PNG "firework" bursts ----------
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function createSprite(x, y) {
  const img = document.createElement("img");
  img.className = "sprite";
  img.src = spriteSources[Math.floor(Math.random() * spriteSources.length)];
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;

  const size = rand(28, 64);
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;

  stage.appendChild(img);
  return img;
}

function burstAt(x, y) {
  if (audioUnlocked && pop && Math.random() < 0.9) {
    try {
      pop.currentTime = 0;
      pop.volume = 0.15;
      pop.play().catch(() => {});
    } catch {}
  }

  if (audioUnlocked && Math.random() < 0.25) {
    playRandomSfx(0.18);
  }

  const count = Math.floor(rand(10, 18));
  const gravity = rand(480, 760);

  for (let i = 0; i < count; i++) {
    const sprite = createSprite(x, y);

    const angle = rand(0, Math.PI * 2);
    const speed = rand(120, 520);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const spin = rand(-720, 720);
    const life = rand(650, 1100);

    const start = performance.now();

    function tick(now) {
      const t = (now - start) / 1000;
      const p = Math.min(1, (now - start) / life);

      const dx = vx * t;
      const dy = vy * t + 0.5 * gravity * t * t;

      sprite.style.opacity = `${1 - p}`;

      const rot = spin * t;
      const sc = 1 - p * 0.15;
      sprite.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(${sc})`;

      if (p < 1) requestAnimationFrame(tick);
      else sprite.remove();
    }

    requestAnimationFrame(tick);
  }
}

document.addEventListener("click", (e) => {
  burstAt(e.clientX, e.clientY);
});

window.setInterval(() => {
  if (Math.random() < 0.15) {
    const x = rand(window.innerWidth * 0.15, window.innerWidth * 0.85);
    const y = rand(window.innerHeight * 0.15, window.innerHeight * 0.85);
    burstAt(x, y);
  }
}, 9000);
