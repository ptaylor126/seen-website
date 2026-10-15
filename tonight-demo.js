"use strict";

/* ============================================================
   Watch together: the Tonight demo
   The app's Watch together deck, playable: swipe (touch or mouse
   drag) or use the buttons or arrow keys. Sam has already said yes
   to two titles; a yes to either is a match. Nothing is stored or
   sent anywhere. Timings and thresholds are the app's
   (tonight-deck.tsx). With reduced motion the cards just change.
   Without JS the page shows the first card as a still.
   ============================================================ */
(function tonightDemo() {
  const root = document.querySelector(".td");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const TITLES = [
    { id: "knives-out", title: "Knives Out", meta: "Film · 2019 · Comedy, Crime · 131 min", sam: true },
    { id: "the-bear", title: "The Bear", meta: "TV · 2022 · Drama, Comedy · 5 seasons", sam: true },
    { id: "sinners", title: "Sinners", meta: "Film · 2025 · Horror, Action · 138 min" },
    { id: "the-penguin", title: "The Penguin", meta: "TV · 2024 · Drama, Crime · 1 season" },
    { id: "past-lives", title: "Past Lives", meta: "Film · 2023 · Drama, Romance · 106 min" },
    {
      id: "spider-verse",
      title: "Spider-Man: Into the Spider-Verse",
      meta: "Film · 2018 · Animation, Action · 117 min",
    },
  ];

  // Released past this share of the card's width, or flung faster than
  // this (px per ms) the same way, a card is decided.
  const DECIDE_SHARE = 0.3;
  const DECIDE_VELOCITY = 0.8;
  const FLY_MS = 200;
  const MAX_TILT_DEG = 12;
  // The stamp is at full strength after this much drag.
  const STAMP_FULL_AT = 40;
  // A button tap nudges the card this far, holds, then flies it off.
  const NUDGE = 56;
  const NUDGE_MS = 120;
  const NUDGE_HOLD_MS = 120;

  const stage = root.querySelector(".td-stage");
  const counter = root.querySelector(".td-counter");
  const play = root.querySelector(".td-play");
  const end = root.querySelector(".td-end");
  const after = root.querySelector(".td-after");
  const stores = root.querySelector(".td-stores");
  const live = root.querySelector("[data-td-live]");
  const btnTitles = root.querySelectorAll(".td-btn-title");

  let deck = TITLES.slice();
  let index = 0;
  let yeses = 0;
  let busy = false;
  let top = null;
  let behind = null;

  const poster = (t) => `assets/tonight-${t.id}.jpg`;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function makeCard(t) {
    const card = el("div", "td-card");
    const face = el("div", "td-face");
    const img = el("img");
    img.src = poster(t);
    img.alt = "";
    img.width = 500;
    img.height = 750;
    img.draggable = false;
    const text = el("div", "td-text");
    text.append(el("p", "td-name", t.title), el("p", "td-meta", t.meta));
    face.append(img, text);
    const yes = el("span", "td-stamp td-stamp--yes", "YES");
    const no = el("span", "td-stamp td-stamp--no", "NO");
    yes.setAttribute("aria-hidden", "true");
    no.setAttribute("aria-hidden", "true");
    card.append(face, yes, no);
    card.stamps = { yes, no };
    return card;
  }

  // The card behind fades in where it waits, so it never pops in.
  function addBehind() {
    const t = deck[index + 1];
    behind = null;
    if (!t) return;
    behind = makeCard(t);
    behind.classList.add("td-card--behind");
    behind.setAttribute("aria-hidden", "true");
    if (!reduceMotion.matches) {
      behind.classList.add("td-card--arriving");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => behind && behind.classList.remove("td-card--arriving"))
      );
    }
    stage.prepend(behind);
  }

  function makeTop(card) {
    const t = deck[index];
    card.classList.remove("td-card--behind", "td-card--arriving");
    card.classList.add("td-card--top");
    card.removeAttribute("aria-hidden");
    card.tabIndex = 0;
    card.setAttribute("role", "group");
    card.setAttribute("aria-roledescription", "card");
    card.setAttribute(
      "aria-label",
      `${t.title}. ${t.meta}. Card ${index + 1} of ${deck.length}. Right arrow for yes, left arrow for no.`
    );
    card.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("keydown", onKeyDown);
    top = card;
    counter.textContent = `${index + 1} of ${deck.length}`;
    btnTitles.forEach((s) => (s.textContent = t.title));
  }

  function deal() {
    stage.textContent = "";
    top = makeCard(deck[index]);
    stage.append(top);
    makeTop(top);
    addBehind();
  }

  function setDrag(card, dx, width) {
    const tilt = reduceMotion.matches ? 0 : (dx / width) * MAX_TILT_DEG;
    card.style.transform = `translateX(${dx}px) rotate(${tilt}deg)`;
    const strength = Math.min(1, Math.abs(dx) / STAMP_FULL_AT);
    card.stamps.yes.style.opacity = dx > 0 ? strength : 0;
    card.stamps.no.style.opacity = dx < 0 ? strength : 0;
  }

  /* ── Dragging ─────────────────────────────────────────────── */

  let drag = null;

  function onPointerDown(e) {
    if (busy || drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    const card = e.currentTarget;
    drag = { id: e.pointerId, x: e.clientX, dx: 0, lastX: e.clientX, lastT: e.timeStamp, v: 0, card };
    card.style.transition = "none";
    card.setPointerCapture(e.pointerId);
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerEnd);
    card.addEventListener("pointercancel", onPointerEnd);
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    setDrag(drag.card, drag.dx, drag.card.offsetWidth);
  }

  function onPointerEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, dx, v } = drag;
    card.removeEventListener("pointermove", onPointerMove);
    card.removeEventListener("pointerup", onPointerEnd);
    card.removeEventListener("pointercancel", onPointerEnd);
    drag = null;
    const width = card.offsetWidth;
    const far =
      e.type === "pointerup" &&
      dx !== 0 &&
      (Math.abs(dx) > width * DECIDE_SHARE || (Math.abs(v) > DECIDE_VELOCITY && Math.sign(v) === Math.sign(dx)));
    if (far) {
      decide(dx > 0, false);
      return;
    }
    // Spring back.
    if (!reduceMotion.matches) {
      card.style.transition = "transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)";
    }
    setDrag(card, 0, width);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      decide(true, true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      decide(false, true);
    }
  }

  /* ── Deciding ─────────────────────────────────────────────── */

  // `nudge`: from a button or key, so the card first leans the way it's
  // going (showing its stamp) before it flies. A swipe flies from where
  // it was let go.
  function decide(yes, nudge) {
    if (busy || !top) return;
    busy = true;
    const card = top;
    const t = deck[index];
    const keepFocus = card.contains(document.activeElement) ? "card" : null;
    if (reduceMotion.matches) {
      decided(yes, t, keepFocus);
      return;
    }
    const width = card.offsetWidth;
    const dir = yes ? 1 : -1;
    const fly = () => {
      card.style.transition = `transform ${FLY_MS}ms ease-in`;
      setDrag(card, dir * width * 1.5, width);
      setTimeout(() => decided(yes, t, keepFocus), FLY_MS);
    };
    if (nudge) {
      card.style.transition = `transform ${NUDGE_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
      setDrag(card, dir * NUDGE, width);
      setTimeout(fly, NUDGE_MS + NUDGE_HOLD_MS);
    } else {
      fly();
    }
  }

  function decided(yes, t, keepFocus) {
    if (yes) yeses += 1;
    top.remove();
    top = null;
    if (yes && t.sam) {
      showEnd(t);
      return;
    }
    index += 1;
    if (index >= deck.length) {
      showEnd(null);
      return;
    }
    if (behind) {
      const next = behind;
      // The card behind grows into place.
      if (!reduceMotion.matches) {
        next.style.transition = "transform 0.25s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.25s ease";
      }
      makeTop(next);
      addBehind();
    } else {
      deal();
    }
    announce(`${yes ? "Yes" : "No"} to ${t.title}. Card ${index + 1} of ${deck.length}.`);
    if (keepFocus === "card") top.focus();
    busy = false;
  }

  /* ── The end: a match, or none ────────────────────────────── */

  function showEnd(match) {
    stage.textContent = "";
    behind = null;
    play.hidden = true;
    end.textContent = "";
    end.className = match ? "td-end td-end--match" : "td-end";
    const heading = el("p", "td-end-heading", match ? "It's a match!" : "No match this time");
    heading.tabIndex = -1;
    if (match) {
      const art = el("div", "td-match-art");
      const img = el("img", "td-match-poster");
      img.src = poster(match);
      img.alt = "";
      img.width = 140;
      img.height = 210;
      const faces = el("div", "td-faces");
      faces.setAttribute("aria-hidden", "true");
      faces.append(photo("you", "td-face-you"), photo("sam", "td-face-sam"));
      art.append(img, faces);
      end.append(art, heading, el("p", "td-end-title", match.title), el("p", "td-end-line", "You and Sam both said yes."));
      if (!reduceMotion.matches) popcorn(faces);
    } else {
      heading.classList.add("td-end-heading--quiet");
      const line = yeses === 0 ? "You passed on all six." : "None of your yeses were Sam's.";
      end.append(heading, el("p", "td-end-line", line));
    }
    end.hidden = false;
    stores.hidden = !match;
    after.hidden = false;
    announce("");
    heading.focus({ preventScroll: true });
    busy = false;
  }

  function photo(who, className) {
    const img = el("img", `td-avatar ${className}`);
    img.src = `assets/tonight-${who}.jpg`;
    img.alt = "";
    img.width = 58;
    img.height = 58;
    return img;
  }

  // The app's popcorn (match-moment.tsx): as the photos meet, 14 kernels
  // pop one after another over 0.45s, each bursting open and flying up and
  // out for 0.75s, falling under gravity and fading as it lands.
  const POP_KERNELS = 14;
  const POP_STAGGER_S = 0.45;
  const KERNEL_FLIGHT_S = 0.75;
  const POP_START_MS = 420;
  const GRAVITY = 1100;

  function popcorn(host) {
    const box = el("div", "td-popcorn");
    const kernels = [];
    for (let i = 0; i < POP_KERNELS; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const k = {
        delay: (i / POP_KERNELS) * POP_STAGGER_S + Math.random() * 0.03,
        vx: side * (30 + Math.random() * 120),
        vy: -(380 + Math.random() * 100),
        spin: (Math.random() - 0.5) * 540,
        size: 14 + Math.round(Math.random() * 6),
        node: el("span", "td-kernel"),
      };
      const d = k.size * 0.62;
      k.node.style.cssText = `width:${k.size}px;height:${k.size}px;margin-left:${-k.size / 2}px`;
      [
        [0, k.size * 0.25, d],
        [k.size - d, k.size * 0.25, d],
        [k.size * 0.19, 0, d],
        [k.size * 0.33, k.size * 0.66, k.size * 0.34],
      ].forEach(([x, y, w]) => {
        const blob = el("i");
        blob.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w}px`;
        k.node.append(blob);
      });
      box.append(k.node);
      kernels.push(k);
    }
    host.append(box);
    const start = performance.now() + POP_START_MS;
    const total = POP_STAGGER_S + KERNEL_FLIGHT_S + 0.05;
    function frame(now) {
      if (!box.isConnected) return;
      const t = (now - start) / 1000;
      kernels.forEach((k) => {
        const s = t - k.delay;
        if (s <= 0 || s >= KERNEL_FLIGHT_S) {
          k.node.style.opacity = 0;
          return;
        }
        const left = KERNEL_FLIGHT_S - s;
        k.node.style.opacity = left < 0.2 ? left / 0.2 : 1;
        const scale = 0.3 + 0.7 * Math.min(1, s / 0.08);
        k.node.style.transform = `translate(${k.vx * s}px, ${k.vy * s + 0.5 * GRAVITY * s * s}px) scale(${scale}) rotate(${k.spin * s}deg)`;
      });
      if (t < total) requestAnimationFrame(frame);
      else box.remove();
    }
    requestAnimationFrame(frame);
  }

  function again() {
    // A fresh order each time; Sam's two yeses stay the same titles.
    deck = TITLES.slice();
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    index = 0;
    yeses = 0;
    end.hidden = true;
    end.textContent = "";
    after.hidden = true;
    play.hidden = false;
    deal();
    top.focus({ preventScroll: true });
  }

  function announce(text) {
    live.textContent = text;
  }

  /* ── Start ────────────────────────────────────────────────── */

  root.querySelectorAll("[data-td-choice]").forEach((btn) =>
    btn.addEventListener("click", () => decide(btn.dataset.tdChoice === "yes", true))
  );
  root.querySelector(".td-again").addEventListener("click", again);

  // Load the other posters once the demo is close, so cards never
  // arrive blank.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        TITLES.forEach((t) => (new Image().src = poster(t)));
        io.disconnect();
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(root);
  }

  root.classList.add("td--live");
  deal();
})();
