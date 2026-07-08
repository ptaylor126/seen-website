# Seen website — project journal

One-page marketing site for **Seen** at **seenrecs.com**. Its job: turn a visitor
into an iOS download, or capture an email if they're on Android. Most traffic
arrives from tapped links (Instagram @seen.recs, TikTok, YouTube Shorts, the App
Store listing), so the page is short and points hard at the download. The two
PRDs in the repo root (`seen-website-prd.md`, `seen-hero-animation-prd.md`) are
the original spec.

## Stack and structure

Plain static site — HTML, CSS, vanilla JS, no framework, no build step. Geist and
Geist Mono load from Google Fonts (self-hosting is a noted later optimisation).

```
index.html    single page: intro overlay shell, hero, screenshots, why, Android
              signup, footer. All SEO/OG/JSON-LD tags in <head>, plus a tiny
              pre-paint inline script that decides whether the intro plays.
styles.css    plum design tokens at the top (:root), then per-section styles.
main.js       Supabase anon key + waitlist URL at the top, then: lockup animation
              helpers, hover eye-follow, first-visit intro + FLIP handoff, scroll
              reveals, Android CTA scroll, waitlist form submit.
assets/       wordwitheyes.svg (real wordmark, inlined into index.html — the copy
              in the HTML is the live one), icon.png + derived favicon-32 /
              apple-touch-icon, og-image.png (1200x630 share image), app
              screenshots (screenshot-*.png, device-framed with transparent
              rounded corners), friend avatars (paul/bobby/bigron.png), show
              posters (poster-*.png, 315x473), google-g.png, tmdb-logo.svg.
CNAME         seenrecs.com (GitHub Pages custom domain)
robots.txt    allow all, points at sitemap.xml
sitemap.xml   the single URL https://seenrecs.com/
```

## Hosting and domain

- GitHub Pages, served from this repo. Custom domain **seenrecs.com** via the
  `CNAME` file; HTTPS enforced in the Pages settings.
- DNS: apex A records to GitHub Pages' four IPs (185.199.108.153 / .109. / .110. /
  .111.), plus a `www` CNAME to the GitHub Pages host.
- **Privacy and Terms are not in this repo.** They live in the app repo's `docs/`
  and are hosted at `ptaylor126.github.io/seen/privacy.html` and
  `.../terms.html`; the footer links out to them. Don't move them — the app links
  to those URLs too.

## External setup

**Supabase waitlist** (project ref `xhzrsdgrgimlrdnyzidr`, same project as the app):

- Table `public.waitlist` (id uuid, email text unique, source text, created_at).
- RLS: anonymous **INSERT only** — no SELECT for anon, so the list can't be read
  from the client. Reads/exports happen in the dashboard.
- The client POSTs to `/rest/v1/waitlist` with the **public anon key** (shipped in
  `main.js`, safe by design) in both `apikey` and `Authorization` headers, and
  `Prefer: return=minimal` — required, because reading the inserted row back
  would hit the missing SELECT policy and error.
- Client behavior: email trimmed + lowercased, format-validated, 409 (already
  signed up) treated as success, hidden honeypot field drops bots silently.

**Email**: `hello@seenrecs.com` is domain-email forwarding (footer contact link).

## The two non-obvious systems

**1. Full-screen intro.** Plays once per visitor: an inline `<head>` script
decides *before first paint* (no flash) and sets `.intro-pending` on `<html>`,
which shows the overlay and locks scroll via CSS. `main.js` clones the hero
lockup into the overlay, plays the sequence (fade in as one piece, three eye
darts with friend rec cards, settle eyes-left), then FLIP-animates it onto the
hero's measured position and removes the overlay — the hero underneath is
already in the identical rest pose, so the swap is invisible.

- `localStorage["seen-intro-seen"]` marks it seen; set on completion **and** on
  skip.
- `?intro` on the URL always replays it (testing switch).
- Skip button: desktop only (hidden ≤600px), keyboard focusable.
- `prefers-reduced-motion`: no intro, no motion, page loads static.
- **The in-page hero never animates on its own.** On any non-intro visit it
  renders statically in the eyes-left rest pose (the SVG's natural state) with
  only the ambient blink and the hover eye-follow (eyes glance toward a hovered
  download button). The full eye sequence exists only inside the intro.

**2. Waitlist form.** Collects emails into Supabase and nothing else — it does
**not** send confirmation or notification emails, and nothing is automated. When
Android ships: export the table from the Supabase dashboard and send one email
manually.

## Key decisions and why

- **Plum brand system** (`--plum #7A3960` etc. in `styles.css`), Geist type. The
  cream-background/terracotta-accent look was explicitly rejected as the generic
  AI-default aesthetic — don't drift back to it.
- **Black download buttons** (both, matched width) like the app's store buttons;
  Apple logo on the App Store button, Google G (not a Play badge) on the Android
  one — it reveals the email signup, and must not look like a live store link.
- **Real content over placeholders**: real friend avatars and show posters in
  the hero rec cards, real app screenshots. Poster art is TMDB-sourced, hence
  the required TMDB attribution + logo in the footer (the line "This product
  uses the TMDB API but is not endorsed or certified by TMDB").
- **Buttons never gated behind animation**: strapline and both CTAs are static
  HTML, visible from the first frame; the animation is decorative on top.
- Eyes rest **looking left** (the app icon's pose) — the exported SVG's natural
  state, so no-JS/reduced-motion render it for free.

## Gotchas

- GitHub Pages + browser caching: after a push, always **hard-refresh
  (Cmd+Shift+R)** before concluding something didn't deploy.
- To see the first-load experience, use `https://seenrecs.com/?intro` — a plain
  reload won't replay the intro once the flag is set.
- The form only collects. Nobody gets an email until you send one.
- The wordmark SVG is inlined in `index.html` (the irises must be animatable
  DOM nodes); `assets/wordwitheyes.svg` is the source of record. If it's ever
  re-exported, re-inline it and keep the `.eye` / `.iris` / `.word-part` classes
  and `data-center-dx/dy` attributes.

## Open loose ends

- TMDB logo colour: currently the official green-blue gradient; decide whether
  the monochrome black version reads better in the footer.
- JSON-LD: no `offers` block — add `price: 0` if we want "Free" in rich results.
- Confirm `hello@seenrecs.com` forwarding actually works end-to-end.
- At real launch: add the App Store link + site URL to social bios, and start
  pointing the reels at seenrecs.com.
- Analytics still unpicked (needs outbound-click tracking on the App Store
  button — page-view-to-download is the metric that matters).
