# Seen Website — Hero Animation PRD

**Scope:** The animated "Seen" lockup at the top of seenrecs.com.
**Related:** Seen Website PRD (this is the detailed spec for section 4, item 1).

---

## 1. What it is

The "Seen" wordmark where the two e's are eyes. On page load the eyes appear, the word forms around them, then the eyes dart left and right while friend and show pairs flash in on the side the eyes are looking. Then everything settles and rests.

The point of it: the logo acts out the product. Eyes glancing at friends' recommendations is "recs from friends" shown rather than explained, before anyone reads a word.

---

## 2. Source of truth: port from the app

The app already animates these eyes. The welcome and onboarding screens have the eye-darting motion (built with Reanimated and Moti). Pull the choreography from there so the site matches the app:

- eye position within the letterforms
- how far the irises travel
- how fast a glance happens and how long it holds
- the resting state

That code is React Native, so it cannot be dropped into a web page directly. Port the choreography to web (CSS animation or the Web Animations API). Keep the timing and feel, change only the implementation. Claude Code can find the animation component in the app repo.

---

## 3. The lockup

- Use the real exported SVG of the wordmark, not a redrawn version. The prototype redrew the S, n, and e-bodies as an approximation, which is why the kerning is rough and the e's are plain discs. The real letterforms fix that.
- The irises must be separate nodes so they can translate left and right inside the eye whites.
- Eye colours from the app icon: grey eye white, amber iris with a darker ring, small light highlight.

---

## 4. Sequence (one play on load, then rest)

1. **Eyes appear.** The two eyeballs fade in with a small scale-up, looking straight ahead.
2. **Word forms.** The rest of the wordmark (S, n, and the plum e-bodies) forms around the eyes and locks them into "Seen."
3. **Eyes dart.** The eyes glance left, then right, then left again. Each time, a friend and show label flashes in on the side the eyes are looking, synced to the glance, then fades as the eyes move away.
4. **Rest.** The eyes return to centre. The label are gone. The lockup sits still.
5. **Ambient life (optional).** A slow blink every several seconds after it rests. Subtle, easy to remove if it reads as fussy.

---

## 5. Timing

Targets, to be matched against the app's actual values:

- Assembly (eyes then word): about 1.2s.
- Each glance: a fast move of roughly 0.15s, then a hold of roughly 0.8s.
- Total intro: about 4 to 5 seconds.

**Decided:** the buttons do not wait for the animation. The prototype gates the strapline and buttons behind the full intro, which is about six seconds. That is too long to hold back the page's main action. So the App Store button, the Android button, and the strapline are visible from the start. The animation plays in the lockup above them and does not gate anything. Remove the delay the prototype puts on the strapline and buttons.

---

## 6. Labels

- Content: friend name plus show title, for example "Deb · The Bear."
- Use real early-user names and real shows, not placeholders, so it reads as genuine.
- Keep each label short enough to read in the split second the eyes are pointed at it. A name and a title is the ceiling. A full rec card with a note is too much while things are moving, save that kind of detail for lower on the page.
- Two or three labels total.

---

## 7. Accessibility and quality floor

- Respect `prefers-reduced-motion`: show the assembled lockup with the eyes centred, no darting, no labels, and the buttons visible. No motion at all in this mode.
- The lockup carries an `aria-label` of "Seen."
- Buttons are keyboard focusable with a visible focus state.
- Works down to a narrow mobile width. The labels sit close to the eyes on small screens so they do not overflow.

---

## 8. Starting point

The prototype file (`seen-hero.html`) already has the structure: the assembly, the gaze track, the synced labels, the reduced-motion handling, and the two buttons. Use it as the reference for structure, then:

- swap the redrawn eyes and letters for the real exported SVG,
- align the timing to the app's animation,
- replace placeholder names and shows with real ones,
- decide the button timing per section 5.
