# Seen website — project journal

One-page marketing site for **Seen** at **seenrecs.com**. Its job: turn a visitor
into an iOS download, or capture an email if they're on Android. Most traffic
arrives from tapped links (Instagram @seen.recs, TikTok, YouTube Shorts, the App
Store listing), so the page is short and points hard at the download. The two
PRDs in the repo root (`seen-website-prd.md`, `seen-hero-animation-prd.md`) are
the original spec.

## Stack and structure

Plain static site — HTML, CSS, vanilla JS, no framework, no build step. Bricolage
Grotesque (display) and Manrope (body) load from Google Fonts as variable faces,
matching the app (self-hosting is a noted later optimisation).

```
index.html    single page: intro overlay shell, hero, screenshots, why, footer.
              All SEO/OG/JSON-LD tags in <head>, plus a tiny pre-paint inline
              script that decides whether the intro plays.
styles.css    V2 navy design tokens at the top (:root), then per-section styles.
main.js       lockup animation helpers, hover eye-follow, first-visit intro +
              FLIP handoff, scroll reveals.
tonight-demo.js  the "Watch together" section's playable Tonight deck (below).
assets/       wordwitheyes.svg (real wordmark, inlined into index.html — the copy
              in the HTML is the live one, and it is the copy that carries the V2
              fills; the .svg file itself is still the plum Figma export),
              icon.png (copied from the app's navy assets/icon.png) + derived
              favicon-32 / apple-touch-icon, og-image.png (1200x630 share image,
              navy), app screenshots (screenshot-*.png, 2000x4112 navy V2,
              device-framed with transparent rounded corners), friend avatars
              (paul/bobby/bigron.png), show posters (poster-*.png, 315x473),
              google-g.png, tmdb-logo.svg.
CNAME         seenrecs.com (GitHub Pages custom domain)
robots.txt    allow all, points at sitemap.xml
sitemap.xml   the home page plus /privacy, /terms, /support and /delete-account
privacy.html, terms.html, support.html, delete-account.html
              the policy and help pages (self-contained, inline styles; served
              at their clean addresses, see Hosting below).
```

## Hosting and domain

- GitHub Pages, served from this repo. Custom domain **seenrecs.com** via the
  `CNAME` file; HTTPS enforced in the Pages settings.
- DNS: apex A records to GitHub Pages' four IPs (185.199.108.153 / .109. / .110. /
  .111.), plus a `www` CNAME to the GitHub Pages host.
- **Privacy, Terms, Support and Delete account live here**, as `privacy.html`,
  `terms.html`, `support.html` and `delete-account.html` at the repo root.
  GitHub Pages serves each at its clean address: seenrecs.com/privacy, /terms,
  /support and /delete-account. Keep those addresses stable: the app's sign-in
  screen links to /privacy and /terms, and App Store Connect and Google Play
  (privacy policy, support and account deletion URLs) point here too. They
  moved from the app repo's GitHub Pages in October 2026, when that repo went
  private.

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

- **Why Seen tiles** (2026-10-14): the heading and two-line lead, then eight
  feature tiles (two columns, one under 700px): recs from friends, rec by link,
  episodes and new-episode alerts, hidden episode comments, Most anticipated,
  Browse, your year, importing. Each visual is HTML/CSS in the app's pieces (chip,
  poster, caption, counters), hidden from screen readers. The Most anticipated
  poster is an unreleased title (Beyond the Spider-Verse, June 2027); swap it
  once that's out.
- **Tonight demo** (2026-10-14): "Watch together" / "Watch with Sam", between the
  screenshots and Why Seen. The app's Watch together deck inside the screenshots'
  own bezel (`assets/phone-frame.png`: screenshot-home.png with its screen, x 81 to
  1919, y 67 to 4042, radius 235 of 2000 x 4112, cut out; 1000px wide, 256
  colours) laid over the demo's screen, with the same glow: swipe (pointer
  events, touch and mouse), the ✕ / ✓ buttons or the arrow keys on the focused
  card. Six titles, fixed metadata in `tonight-demo.js`; Sam's yeses are Knives
  Out and The Bear, so a yes to either shows "It's a match!" (the app's MatchCard,
  with the Welcome photos of you and Sam, `assets/tonight-you.jpg` /
  `tonight-sam.jpg`, and its popcorn burst) with the store buttons and Try again
  (which shuffles). No match: "You passed on all six." or "None of your yeses
  were Sam's." Card look, sizes,
  thresholds and timings follow the app's `tonight-deck.tsx` and
  `match-moment.tsx`; the meta line may wrap here (the card is smaller than a
  phone's). Reduced motion: cards just change, no popcorn. No JS: the first card as a still
  and a line saying how it works. Nothing stored or sent. Posters are TMDB's w500
  (`assets/tonight-*.jpg`, recompressed), credited "Posters from TMDB" under the
  demo as well as the footer's TMDB notice.
- **V2 navy brand system** (2026-08-09), replacing the plum-on-cream V1. Tokens in
  `styles.css` (`--ground #0B0D26`, `--surface #151838`, `--accent #9D8DF0`,
  `--text #E6E6E6`) are lifted **verbatim** from the app's `paletteV2` in
  `seen/src/theme/theme.ts`. Don't tune them here in isolation — the whole point
  is that the site and the app are one surface. The old cream/terracotta look was
  already rejected as the generic AI-default aesthetic; don't drift back to it.
- **White on the lavender accent is only 2.80:1** — filled accent elements take
  dark `--on-accent` ink, never white. `--pupil` exists for the same reason: the
  wordmark's letterforms carry the accent but its pupils must stay ground-dark,
  or the eyes go purple (the app hit this too — see `animated-logo.tsx`).
- **White download buttons** (both, matched width). The V1 black pills read as
  holes punched in the navy; white is also the ground the full-colour Google G is
  drawn for, and it keeps lavender exclusive to the wordmark so the hero has one
  focal point. Apple logo on the App Store button, Google G on the Google Play
  one. Both are live store links (Play listing: com.paultaylor.seen).
- **Hairlines, not shadows, do the separating.** On navy a dark drop-shadow is
  invisible, and the `--ground`→`--surface` step is deliberately subtle (1.11:1,
  matching the app). So the "Why" band takes `border-block`, posters and
  screenshots take a 1px `--line` frame (mirroring the app's `posterFrame`), and
  the screenshot glow is lavender-tinted rather than black.
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
  DOM nodes); `assets/wordwitheyes.svg` is the source of record for the *shapes*.
  If it's ever re-exported, re-inline it and keep the `.eye` / `.iris` /
  `.word-part` classes and `data-center-dx/dy` attributes — **and re-apply the V2
  fills**, because the exported file is still the original plum artwork. The app
  keeps its identical copy plum too and re-colours in code, so the two stay in
  step. Correct fills: letterforms + the two `e`-slot rects `var(--accent)`,
  pupils `var(--pupil)`; the `#D9D9D9` sclerae and the gold iris gradient are
  unchanged (the app deliberately kept both).

## Open loose ends

- TMDB logo colour: currently the official green-blue gradient; decide whether
  the monochrome black version reads better in the footer.
- JSON-LD: no `offers` block — add `price: 0` if we want "Free" in rich results.
- Confirm `hello@seenrecs.com` forwarding actually works end-to-end.
- At real launch: add the App Store link + site URL to social bios, and start
  pointing the reels at seenrecs.com.
- Analytics still unpicked (needs outbound-click tracking on the App Store
  button — page-view-to-download is the metric that matters).
