"use strict";

/* ============================================================
   PASTE YOUR SUPABASE ANON KEY BELOW.
   This is the PUBLIC anon key (same value as the app's
   EXPO_PUBLIC_SUPABASE_ANON_KEY). It is safe to ship in page
   source: RLS on the waitlist table only allows anonymous
   INSERT, so the key cannot read anything.
   ============================================================ */
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoenJzZGdyZ2ltbHJkbnl6aWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTgzNTMsImV4cCI6MjA5NDU3NDM1M30.4XG97UWpLtFpDROe7Xf8Z8zJfcEMT49Hn5Qg0lOy_wQ";

const WAITLIST_URL = "https://xhzrsdgrgimlrdnyzidr.supabase.co/rest/v1/waitlist";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Lockup animation helpers
   Shared by the in-place hero animation and the first-visit
   full-screen intro, so both play the identical sequence: the
   complete lockup appears as one piece, holds briefly, then the
   eyes dart left / right / left (0.15s move + ~0.8s hold each)
   with a friend label synced to every glance, and settle looking
   left (the app icon's pose, which is the SVG's natural state).

   The default DOM state is the resting, assembled lockup with
   labels hidden, so with reduced motion (or no JS) nothing here
   runs and the page is simply complete.
   ============================================================ */
const EASE_POP = "cubic-bezier(0.2, 0.8, 0.3, 1)";
const EASE_DART = "cubic-bezier(0.3, 0.1, 0.3, 1)";
const GAZE_X = 18; // iris travel in SVG units

// The whole lockup — letterforms and eyes together — appears as one
// piece. The eyes hold centred through this (the gaze track fills
// backwards), then dart after a brief rest.
function appearAsOne(el) {
  el.animate(
    [
      { opacity: 0, transform: "scale(0.98)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 500, easing: EASE_POP, fill: "backwards" }
  );
}

// Gaze track: left, right, left, then settle into the rest pose.
// Starts at t=1400ms, runs 2850ms; the offsets encode move/hold
// boundaries. data-center-dx/dy is each iris's offset to the sclera
// centre; darts are ±GAZE_X from centre, and the final keyframe
// returns to translate(0) = the left-looking rest pose.
function runGaze(container) {
  container.querySelectorAll(".iris").forEach((iris) => {
    const dx = parseFloat(iris.dataset.centerDx) || 0;
    const dy = parseFloat(iris.dataset.centerDy) || 0;
    const centre = `translate(${dx}px, ${dy}px)`;
    const left = `translate(${dx - GAZE_X}px, ${dy}px)`;
    const right = `translate(${dx + GAZE_X}px, ${dy}px)`;
    const rest = "translate(0px, 0px)";
    iris.animate(
      [
        { transform: centre, offset: 0, easing: EASE_DART },
        { transform: left, offset: 0.053 },
        { transform: left, offset: 0.333, easing: EASE_DART },
        { transform: right, offset: 0.386 },
        { transform: right, offset: 0.667, easing: EASE_DART },
        { transform: left, offset: 0.719 },
        { transform: left, offset: 0.947, easing: EASE_DART },
        { transform: rest, offset: 1 },
      ],
      { duration: 2850, delay: 1400, fill: "backwards" }
    );
  });
}

function flashLabel(el, side, showAt, hideAt) {
  if (!el) return;
  const from = side === "left" ? "translateX(10px)" : "translateX(-10px)";
  el.animate(
    [
      { opacity: 0, transform: `${from} scale(0.94)` },
      { opacity: 1, transform: "translateX(0) scale(1)" },
    ],
    { duration: 200, delay: showAt, easing: EASE_POP, fill: "forwards" }
  );
  el.animate(
    [
      { opacity: 1, transform: "translateX(0) scale(1)" },
      { opacity: 0, transform: `${from} scale(0.96)` },
    ],
    { duration: 180, delay: hideAt, easing: "ease-in", fill: "forwards" }
  );
}

// Labels flash in on the side the eyes are looking, synced to each
// glance window: left 1400–2350, right 2350–3300, left 3300–4100.
function runLabelFlashes(container) {
  flashLabel(container.querySelector(".gaze-label--left:not(.gaze-label--low)"), "left", 1450, 2280);
  flashLabel(container.querySelector(".gaze-label--right"), "right", 2500, 3230);
  flashLabel(container.querySelector(".gaze-label--low"), "left", 3450, 4030);
}

// Ambient life: a slow blink every several seconds after rest.
function startBlink(container) {
  const eyes = container.querySelectorAll(".eye");
  window.setTimeout(() => {
    window.setInterval(() => {
      eyes.forEach((eye) => {
        eye.animate(
          [
            { transform: "scaleY(1)" },
            { transform: "scaleY(0.08)", offset: 0.5 },
            { transform: "scaleY(1)" },
          ],
          { duration: 240, easing: "ease-in-out" }
        );
      });
    }, 6000);
  }, 4600);
}

/* ============================================================
   Hover eye-follow
   After the intro/darts have finished, hovering a top button
   makes the irises glance down toward it (App Store sits
   lower-left, Android lower-right), returning to the resting
   eyes-left pose on leave. Base-style transforms + the CSS
   .iris transition, so it composes cleanly with the WAAPI
   blink and never runs alongside the dart sequence.

   Targets are centre-relative (via data-center-dx/dy) and stay
   well inside the eye whites: the iris centre may travel within
   roughly an ellipse of 32.7 x 17.6 units around the sclera
   centre before the iris edge touches the white's edge, and
   (±14, +10) uses about half of that in each axis.
   ============================================================ */
function enableEyeFollow(container) {
  if (!window.matchMedia("(hover: hover)").matches) return;

  const irises = container.querySelectorAll(".iris");
  const buttons = document.querySelectorAll(".cta-row .btn--store");
  if (!irises.length || buttons.length < 2) return;

  const FOLLOW_X = 14;
  const FOLLOW_Y = 10;

  function look(x, y) {
    irises.forEach((iris) => {
      const dx = parseFloat(iris.dataset.centerDx) || 0;
      const dy = parseFloat(iris.dataset.centerDy) || 0;
      iris.style.transform = `translate(${dx + x}px, ${dy + y}px)`;
    });
  }

  function rest() {
    irises.forEach((iris) => {
      iris.style.transform = "";
    });
  }

  const aims = [
    { x: -FOLLOW_X, y: FOLLOW_Y }, // App Store button, lower-left
    { x: FOLLOW_X, y: FOLLOW_Y }, // Android button, lower-right
  ];
  buttons.forEach((btn, i) => {
    const aim = aims[i];
    btn.addEventListener("mouseenter", () => look(aim.x, aim.y));
    btn.addEventListener("mouseleave", rest);
  });
}

/* ============================================================
   First-visit intro / hero animation
   The head script decides pre-paint whether the intro plays
   (first visit or ?intro, never with reduced motion) and flags
   it with .intro-pending on <html>. Exactly one of these runs:

   - Intro: the lockup plays its sequence full screen in the
     overlay, then FLIPs onto the hero's measured position; the
     hero itself stays in its static rest pose underneath so the
     swap is invisible, and it does NOT re-dart.
   - Hero: the same sequence plays in place, as always.
   ============================================================ */
const INTRO_FLAG = "seen-intro-seen";
const playIntro = document.documentElement.classList.contains("intro-pending");

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_FLAG, "1");
  } catch (e) {}
}

(function heroOrIntro() {
  if (prefersReducedMotion) return;

  const heroLockup = document.querySelector(".hero .lockup");
  const heroSvg = heroLockup && heroLockup.querySelector(".lockup-svg");
  if (!heroSvg) return;

  if (!playIntro) {
    appearAsOne(heroSvg);
    runGaze(heroLockup);
    runLabelFlashes(heroLockup);
    startBlink(heroLockup);
    // Arm the hover-follow only once the dart sequence has settled
    // (darts end at ~4250ms), so the two never fight over the irises.
    window.setTimeout(() => enableEyeFollow(heroLockup), 4300);
    return;
  }

  const overlay = document.getElementById("intro");
  const stage = document.getElementById("intro-stage");
  const skipBtn = document.getElementById("intro-skip");
  if (!overlay || !stage || !skipBtn) return;

  // Clone the hero lockup into the overlay so the intro shows the
  // exact same artwork. Strip cloned ids (the originals keep them;
  // fill url(#…) references still resolve to the hero's gradients).
  const svgClone = heroSvg.cloneNode(true);
  svgClone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  svgClone.removeAttribute("id");
  stage.appendChild(svgClone);
  heroLockup.querySelectorAll(".gaze-label").forEach((label) => {
    const clone = label.cloneNode(true);
    clone.removeAttribute("id");
    stage.appendChild(clone);
  });

  // The FLIP below measures the hero's viewport position, so make
  // sure we are at the top of the page while the overlay is up.
  window.scrollTo(0, 0);

  let done = false;

  appearAsOne(svgClone);
  runGaze(stage);
  runLabelFlashes(stage);
  const handoffTimer = window.setTimeout(handoff, 4500);

  function finish() {
    if (done) return;
    done = true;
    window.clearTimeout(handoffTimer);
    markIntroSeen();
    overlay.remove();
    document.documentElement.classList.remove("intro-pending");
    startBlink(heroLockup);
    // The hero never darted on an intro visit, so the irises are free.
    enableEyeFollow(heroLockup);
  }

  // FLIP handoff: measure where the hero lockup really is, animate the
  // intro lockup to land exactly on it while the backdrop fades to
  // reveal the site, then swap. The hero underneath is already resting
  // eyes-left (its no-intro animation never ran), so removing the
  // overlay is invisible.
  function handoff() {
    if (done) return;
    const from = svgClone.getBoundingClientRect();
    const to = heroSvg.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = to.width / from.width;

    const move = stage.animate(
      [
        { transform: "translate(0px, 0px) scale(1)" },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 700, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
    );
    overlay
      .querySelector(".intro-bg")
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: "ease-out", fill: "forwards" });
    skipBtn.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });

    // finish() is idempotent: the finished promise is the precise signal,
    // and the timer is a safety net in case it never resolves (e.g. the
    // animation is cancelled by devtools or a throttled tab).
    move.finished.then(finish).catch(finish);
    window.setTimeout(finish, 720);
  }

  skipBtn.addEventListener("click", finish);
})();

/* ============================================================
   Scroll-in reveals
   One identical, subtle motion everywhere: 12px rise + fade,
   triggered once as the element enters the viewport, then it
   stays. The .reveal class is only ever added here, so with
   reduced motion (or no JS) everything simply sits in its final
   position — no observer, no motion.
   ============================================================ */
(function scrollReveals() {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  const targets = [];

  // Why Seen: heading then the two text blocks, staggered so they
  // read in order.
  document
    .querySelectorAll(".section--why h2, .section--why .why-copy")
    .forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${i * 120}ms`);
      targets.push(el);
    });

  // Each screenshot rises in as it is reached.
  document.querySelectorAll(".shot").forEach((el) => targets.push(el));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
})();

/* ============================================================
   Android CTA: scroll to the signup section
   The form is always visible there, so the hero button just
   takes you to it and focuses the email field.
   ============================================================ */
(function androidCta() {
  const heroCta = document.getElementById("android-cta");
  const emailInput = document.getElementById("signup-email");
  const section = document.getElementById("android");
  if (!heroCta || !section || !emailInput) return;

  heroCta.addEventListener("click", () => {
    section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    emailInput.focus({ preventScroll: true });
  });
})();

/* ============================================================
   Waitlist form → Supabase (site PRD §7)
   ============================================================ */
(function waitlistForm() {
  const form = document.getElementById("signup-form");
  const emailInput = document.getElementById("signup-email");
  const honeypot = document.getElementById("signup-website");
  const submitBtn = document.getElementById("signup-submit");
  const status = document.getElementById("signup-status");
  if (!form) return;

  const SUCCESS_COPY = "You are on the list. We will tell you when Android lands.";
  const ERROR_COPY = "Something went wrong. Try again.";

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Honeypot filled → bot. Drop silently (pretend it worked).
    if (honeypot && honeypot.value !== "") {
      setStatus(SUCCESS_COPY, false);
      form.reset();
      return;
    }

    const email = emailInput.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("Enter a valid email address.", true);
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    setStatus("", false);

    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          // return=minimal matters: anon has no SELECT policy, so
          // reading the inserted row back would error.
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: email, source: "website" }),
      });

      // 409 = unique violation = already signed up. Treat as success;
      // never reveal whether an email is on the list.
      if (res.ok || res.status === 409) {
        setStatus(SUCCESS_COPY, false);
        form.reset();
      } else {
        setStatus(ERROR_COPY, true);
      }
    } catch (err) {
      setStatus(ERROR_COPY, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
