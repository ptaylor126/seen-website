# Seen Website — PRD

**Project:** Marketing site for Seen at seenrecs.com
**Repo:** `seen-website` (`/Users/paultaylor/Projects/seen-website`), separate from the app repo
**Status:** Draft for build

---

## 1. Purpose

A one-page marketing site for Seen. Its job is to turn a visitor into an iOS download, or, if they are on Android, capture their email so we can tell them when the Android version ships.

Most traffic will arrive from tapped links: Instagram (@seen.recs), TikTok, YouTube Shorts, and the App Store listing. Those visitors have usually already seen the pitch in the reel that sent them, so the page is short and points hard at the download. It does not do a long explainer. A smaller group will hear the name and search for it or type the domain, so the page still says what Seen is in one or two lines.

The core premise stays front and centre: recommendations from friends you trust, not an algorithm.

---

## 2. Goals and non-goals

**Goals**
- Fast load on mobile (most traffic is mobile).
- One obvious primary action: Download on the App Store.
- Capture Android emails cleanly, without a fake Play Store badge.
- On brand: plum system, Geist, the animated eyes lockup.
- Measure page-view-to-download, which is the metric that matters.

**Non-goals for v1**
- No blog, no multi-page site, no accounts or login.
- No live app data and no TMDB fetching on the site.
- No Google Play badge until the Android app is actually live.
- No audio in the hero animation.

---

## 3. Success measures

- Page-view-to-download rate (outbound clicks on the App Store button divided by page views). This is the meaningful number, not headline impressions.
- Android email signups.

Analytics tool is an open decision (see section 10). Whatever we pick needs to record the outbound click on the App Store button, not just page views.

---

## 4. Page structure

Single page, top to bottom:

1. **Hero.** Animated eyes-in-word lockup (full spec in the Hero Animation PRD), then a one-line strapline, then two buttons:
   - Download on the App Store (live link to `https://apps.apple.com/app/id6775920785`).
   - Get notified on Android (reveals the email field, or scrolls to the signup section).
2. **App screenshots.** Three or four real screens that show the product: home recs, a friend rec with a note, the library, and a friend profile. Use current app screenshots that reflect the 1.0.x nav.
3. **Short "why" section.** A few plain lines on friends, not algorithms. Optionally the three-step how-it-works (follow friends, get recs with a reason, watch and pass it on). Keep it brief.
4. **Android signup.** "Coming to Android. Get notified." Email field plus button. Can be the same block the hero button reveals, or a dedicated section lower down. One signup mechanism either way.
5. **Footer.** Privacy and Terms links (existing pages in the app repo, hosted on GitHub Pages), a contact email, and TMDB attribution.

---

## 5. Brand and design tokens

Use the plum system from the app. Do not drift into a cream background with a terracotta accent, that combination is the generic default look and is off brand for Seen.

```
--plum:       #7A3960   /* accent, brand */
--plum-dark:  #5E2B4A   /* hover */
--wash:       #E4CADB   /* soft plum panels */
--wash-deep:  #EFE7EC   /* icon background tone, section wash */
--ink:        #241A20   /* near-black warm text */
--muted:      #6E6169   /* secondary text */
--paper:      #FBF9FA   /* page background, warm white, not cream */
--line:       #ECE3E8   /* hairlines */
```

- **Type:** Geist for everything, Geist Mono for small labels and eyebrows.
- **Buttons:** stadium pills, to echo the app's nav. App Store button is filled plum. Android button is outlined.
- **Motion:** the hero animation is the one bold moment. Everything else stays quiet.

---

## 6. Assets

Reuse what already exists in the app rather than remaking it.

- **Wordmark / logo.** Export a clean SVG of the "Seen" lockup from Figma or the app assets. The two eyes must be separable nodes (irises as their own elements) so the animation can move them. This replaces the redrawn approximation in the prototype.
- **App icon.** Already have `icon.png`.
- **Screenshots.** Pull current device screenshots. If the parked App Store screenshot refresh happens, reuse those assets here.
- **Avatar gradients.** Reuse the indigo and cerulean avatar gradients from the app for the friend labels in the hero.

Since Claude Code runs locally, it can locate the exact asset files in the app repo. This PRD only says which assets, not their paths.

---

## 7. Email capture

**Recommended approach:** the form posts directly to Supabase from the static page, using the public anon key, into a new insert-only table. No serverless function.

**Table** (`public.waitlist`):
- `id` uuid, default `gen_random_uuid()`, primary key
- `email` text, unique
- `source` text (e.g. 'website'), for later attribution
- `created_at` timestamptz, default `now()`

**RLS:** enable RLS, add a policy that allows anonymous `INSERT` only. No `SELECT` for anon, so the list cannot be read from the client. Reads happen from the dashboard when exporting.

**Setup notes** (carry over the known Supabase quirks):
- Apply the migration through the dashboard SQL editor, then verify with `information_schema` rather than trusting the "Success" message.
- After creating the table and policy, run `NOTIFY pgrst, 'reload schema';` or PostgREST will silently reject writes.

The table is created by `waitlist-setup.sql` (run once in the dashboard SQL editor).

**Client wiring:**
- POST to `https://xhzrsdgrgimlrdnyzidr.supabase.co/rest/v1/waitlist`.
- Headers: `apikey` and `Authorization: Bearer <anon key>` both set to the public anon key (same value as the app's `EXPO_PUBLIC_SUPABASE_ANON_KEY`, safe to ship in page source), `Content-Type: application/json`, and `Prefer: return=minimal`. The `return=minimal` matters: the table has no select policy for anon, so if the request tries to read the row back it will error.
- Body: `{ "email": "...", "source": "website" }`.
- Lowercase and trim the email before sending, so you do not get near-duplicates.
- Validate email format before sending.
- Treat a 409 (unique violation, already signed up) the same as success. Never tell a visitor whether their email is already on the list.
- Add a hidden honeypot field. If it is filled, drop the submission silently. This stops most bot spam without a captcha. If spam gets bad later, the fallback is a serverless function, but do not build that now.
- Success copy, plain: "You are on the list. We will tell you when Android lands."
- Error copy, plain: "Something went wrong. Try again."

**When Android ships:** export the table from the dashboard and send one email. No automation needed for v1.

**Alternatives if we move off this approach:**
- Vercel or Netlify serverless function in front of Supabase, if we want to hide the insert, add spam protection, or send a confirmation email.
- A form service (Buttondown, Formspree) if we want collection and sending handled for us, at the cost of another dependency.

---

## 8. Tech stack

- Plain static site: HTML, CSS, and a small amount of vanilla JS. No framework needed for a single page. It loads fast, hosts anywhere, and is easy for Claude Code to work on.
- Fonts: load Geist from Google Fonts for v1, since it is the least work. Self-hosting is faster and removes a third-party request, so treat it as a later optimisation, not a v1 task.
- Keep it to a handful of files: `index.html`, a stylesheet, one JS file, an `assets/` folder.

---

## 9. Hosting and deploy

**Decided:** GitHub Pages from the `seen-website` repo, custom domain seenrecs.com. This keeps the site in the same ecosystem as the existing privacy and terms pages, and the form writing straight to Supabase means no serverless function is needed. Set the apex and www DNS records to GitHub, add the `CNAME` file, HTTPS is handled by Pages.

Leave the privacy and terms pages where they are in the app repo. The app links to them, and moving them risks breaking those in-app links. The site just links out to them.

---

## 10. Decisions

Locked:
- **Host:** GitHub Pages, custom domain seenrecs.com.
- **Email backend:** form writes straight to a Supabase `waitlist` table in the seen project, using the public anon key. No serverless function.
- **Fonts:** Geist from Google Fonts for v1.

Remaining, low stakes, does not block the build:
- **Analytics.** Add at the end as a script tag. It needs to record the outbound click on the App Store button, not just page views, so we can measure page-view-to-download. Plausible does outbound-click tracking cleanly and is paid. Cloudflare Web Analytics is free but its click tracking is weaker. Pick at the end.
- **Contact email** for the footer. Needs a real address, for example hello@seenrecs.com once email is set up on the domain, or your existing support address.

---

## 11. Out of scope for v1

Blog, multi-page, accounts, live app data, TMDB fetching, Play Store badge, audio in the hero, automated Android launch email.
