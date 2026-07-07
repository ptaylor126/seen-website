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
   Hero animation
   One play on load, then rest. Timing per the Hero Animation
   PRD (§5): assembly ~1.2s, each glance = 0.15s move + 0.8s
   hold, total intro ~4.25s. The strapline and buttons are NOT
   gated behind the animation — they are static HTML, visible
   from the start.

   The CSS default state is the resting, assembled lockup with
   eyes centred and labels hidden, so with reduced motion (or
   no JS) we simply never animate.
   ============================================================ */
(function heroAnimation() {
  if (prefersReducedMotion) return;

  const eyes = document.querySelectorAll(".eye");
  const irises = document.querySelectorAll(".iris");
  const wordParts = document.querySelectorAll(".word-part");
  if (!eyes.length || !irises.length) return;

  const EASE_POP = "cubic-bezier(0.2, 0.8, 0.3, 1)";
  const EASE_DART = "cubic-bezier(0.3, 0.1, 0.3, 1)";
  const GAZE_X = 18; // iris travel in SVG units

  // 1. Eyes appear: fade in with a small scale-up, looking straight.
  eyes.forEach((eye) => {
    eye.animate(
      [
        { opacity: 0, transform: "scale(0.7)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 420, easing: EASE_POP, fill: "backwards" }
    );
  });

  // 2. Word forms: S, e-bodies and n lock the eyes into "Seen".
  wordParts.forEach((part) => {
    part.animate(
      [
        { opacity: 0, transform: "scale(1.06)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 600, delay: 480, easing: EASE_POP, fill: "backwards" }
    );
  });

  // 3. Gaze track: left, right, left, then back to centre.
  //    Starts at t=1400ms, runs 2850ms. Each dart is 150ms with an
  //    ~800ms hold; the offsets below encode move/hold boundaries.
  const gazeKeyframes = [
    { transform: "translateX(0px)", offset: 0, easing: EASE_DART },
    { transform: `translateX(${-GAZE_X}px)`, offset: 0.053 },
    { transform: `translateX(${-GAZE_X}px)`, offset: 0.333, easing: EASE_DART },
    { transform: `translateX(${GAZE_X}px)`, offset: 0.386 },
    { transform: `translateX(${GAZE_X}px)`, offset: 0.667, easing: EASE_DART },
    { transform: `translateX(${-GAZE_X}px)`, offset: 0.719 },
    { transform: `translateX(${-GAZE_X}px)`, offset: 0.947, easing: EASE_DART },
    { transform: "translateX(0px)", offset: 1 },
  ];
  irises.forEach((iris) => {
    iris.animate(gazeKeyframes, { duration: 2850, delay: 1400 });
  });

  // 4. Labels flash in on the side the eyes are looking, synced to
  //    each glance, and fade as the eyes move away.
  //    Glance windows (absolute ms): left 1400–2350, right 2350–3300,
  //    left 3300–4100.
  function flashLabel(id, side, showAt, hideAt) {
    const el = document.getElementById(id);
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
  flashLabel("gaze-label-1", "left", 1450, 2280);
  flashLabel("gaze-label-2", "right", 2500, 3230);
  flashLabel("gaze-label-3", "left", 3450, 4030);

  // 5. Ambient life: a slow blink every several seconds after rest.
  //    Subtle, and easy to remove if it reads as fussy.
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
})();

/* ============================================================
   Android CTA: reveal the email field
   ============================================================ */
(function androidReveal() {
  const heroCta = document.getElementById("android-cta");
  const revealBtn = document.getElementById("android-reveal");
  const form = document.getElementById("signup-form");
  const emailInput = document.getElementById("signup-email");
  const section = document.getElementById("android");
  if (!form || !emailInput) return;

  function revealForm() {
    form.hidden = false;
    if (revealBtn) revealBtn.hidden = true;
  }

  if (revealBtn) {
    revealBtn.addEventListener("click", () => {
      revealForm();
      emailInput.focus();
    });
  }

  if (heroCta) {
    heroCta.addEventListener("click", () => {
      revealForm();
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      emailInput.focus({ preventScroll: true });
    });
  }
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
