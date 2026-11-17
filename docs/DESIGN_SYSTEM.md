# Global Design System

## Brand

Use **Mailkind** as the product name and "See what needs your attention." as the
homepage headline. Keep copy warm and direct, with Lucide icons for useful actions
and status indicators. The wordmark uses the existing display typography. The generated Mailkind mark is
served from `public/images/mailkind-logo.png`: a butter-yellow tile with an ivory
envelope and charcoal outlines. `BrandIdentity` shares the same mark and text across
the landing header/footer and app header; the PNG is also the browser favicon.
The generation prompt is saved in `docs/assets/mailkind-logo-prompt.md`.

## Reference and interpretation

Studied [dontlookup.app](https://www.dontlookup.app/) through web search and its public
HTML/CSS on November 16, 2026. The findings below describe source rules, rather than
an interactive browser audit.

The reference pairs expressive Marsipan display lettering with rounded Nunito body
text, warm paper
with dark ink, heavy outlines, irregular rounded corners, and crisp offset shadows.
Its navigation is an action rail, rather than a conventional website header. Icons
occupy consistent boxes; dark primary controls contrast with light alternatives.
Controls generally use a 44px height, 2–3px outlines, and short press transitions.
Underlined text links remain distinct from buttons. Cards, tooltips, meters, and small
labels share the same visual language. Color identifies game states sparingly.
Its CSS uses fluid type and capped viewport widths, changes control placement below
820px and for coarse pointers, reflows
landscape layouts on short screens, respects safe-area insets, and reduces animation
when requested.

Our adaptation uses independently chosen colors, system fonts, regular corners, and
normal document flow. Readability, text selection, scrolling, and keyboard operation
take priority for an inbox. No reference copy, fonts, images, icons, or branding are
included. `pages/HomePage.tsx` uses original landing content and Lucide React icons;
the right-side fictional inbox preview remains without Try the demo links. Its only sign-in control is in the
navbar, visible at all widths. It uses the standard Google color logo on a white
button, sourced from the [official branding assets](https://developers.google.com/identity/branding-guidelines)
and served locally as `public/images/google-g.png`. The workspace illustration is generated for Mailkind and served locally from
`public/images/mailkind-workspace.png`. It replaces the earlier stock photo, using
warm cream paper, charcoal outlines, butter yellow, muted blue and sage accents.
The Unsplash footer attribution is removed alongside the photo replacement.

## Files and tokens

`frontend/src/index.css` imports Tailwind v4 and four shared files:

- `styles/theme.css`: `@theme static` exposes semantic Tailwind utilities such as
  `bg-paper`, `text-ink`, `text-muted`, `border-line`, `font-display`, `text-heading`,
  `rounded-panel`, and `shadow-press`. Static emission keeps tokens available before
  a page uses them. No legacy `tailwind.config.js` is necessary.
- `styles/base.css`: document colors/type, fluid headings, readable links, keyboard
  focus, selection, and form-font inheritance. Body text starts at 16px with 1.65 line
  height; captions start at 14px. Headings balance their lines, paragraphs wrap naturally.
- `styles/primitives.css`: Tailwind layout utilities and opt-in component classes.
  Standard component adjustments still use Tailwind utilities.
- `styles/motion.css`: opt-in entrances, exits, stagger, hover lift, and state transitions.

Use a four-pixel spacing scale (`gap-2`, `p-4`, `gap-6`, `p-8`). Gutters grow from
16–40px and section spacing from 32–80px. Page/content widths stop at 76rem/64rem;
reading text stops at 68ch. Breakpoints are `sm` 40rem, `md` 52rem, `lg` 68rem,
and `xl` 80rem. Prefer content-driven wrapping to hiding information.

## Primitives and usage

```tsx
<main className="page-container section-space stack gap-8">
  <header className="stack gap-3 reading-width">
    <p className="eyebrow">Workspace</p>
    <h1>Inbox overview</h1>
  </header>
  <nav aria-label="Workspace" className="cluster gap-2">
    <a className="nav-link" href="/inbox" aria-current="page">Inbox</a>
  </nav>
  <div className="auto-grid">
    <section className="surface stack gap-4">
      <h2>Review queue</h2>
      <button type="button" className="button">Review</button>
    </section>
  </div>
</main>
```

- `stack` is vertical; `cluster` wraps horizontal items. Override gaps with `gap-*`.
- `auto-grid` fits as many 16rem columns as space allows and collapses without overflow.
  `sidebar-layout` stacks until 68rem, then adds a 17rem sidebar. Child widths can shrink.
- Combine `surface surface-raised` for an emphasized panel. Use `border-rule` for quiet
  separators and `border-outline` for interactive boundaries; avoid raising every panel.
- `.button` is primary; add `button-secondary`, `button-quiet`, or `button-icon`.
  Controls have a 44px minimum height and allow multiline labels. Import named icons
  directly from `lucide-react`; `.lucide` sets the shared size, with Tailwind overrides
  where needed. Hide decorative icons from assistive technology with `aria-hidden="true"`.
  Icon-only buttons need an accessible label. Use anchors for navigation and buttons
  for actions; `aria-disabled` styling alone does not prevent an anchor from activating.
- Text links stay underlined. Active navigation uses `aria-current="page"`, an outline,
  and a highlight fill. Use semantic success/warning/danger token pairs with a text label.
- All focusable elements retain a three-pixel focus ring. Hover motion is limited to
  fine pointers; reduced-motion removes press movement. Forced-color mode retains
  boundaries and an underlined active state. Keep keyboard order equal to document order.

## Copy and icon direction

Use warm, direct language that describes the task. Headings and actions should tell
people what they can do: “See what needs your attention,” “Copy reply,” and “Mark reviewed.”
Avoid repeated promises about clarity or calm, filler strips, floating slogans, and
eyebrows that restate the next heading. Keep each section's purpose distinct.

Place one clear demo notice beside the inbox. Preserve useful priorities, reply/review
states, and counts, without repeating the demo disclaimer in every control and dialog.
Keep the paper/ink palette, outlines, and headline underline. Lucide icons belong mainly
on actions, disclosure controls, and useful states; section decorations do not need icons.

## Motion system

The reference's source stages its title, supporting text, and actions with delayed
fade/translate/scale entrances. Several easing curves overshoot; tutorial rows enter
in sequence, controls move into their offset shadows, overlays fade out, and game
alerts and decorative effects repeat. Our adaptation uses shorter timing and small
travel. No game animation or choreography is copied.

Shared tokens in `theme.css` set fast feedback to 120ms, state changes to 180ms,
entrances to 320ms, exits to 140ms, and stagger increments to 45ms. Easing tokens
include `ease-enter`, `ease-pop`, and `ease-exit` for Tailwind transition utilities.

| Class | Purpose |
| --- | --- |
| `motion-enter` | One-time fade and 8px upward arrival on mount. |
| `motion-pop` | One-time fade from 98% scale with a restrained settle. |
| `motion-stagger` | Enter direct children sequentially; delay is capped at 135ms. |
| `motion-exit` + `inert` | Fade out and move 4px upward while already noninteractive. |
| `motion-lift` | Optional 2px hover lift on fine pointers; use on interactive surfaces. |

```tsx
<section className="surface motion-enter">...</section>
<div className="auto-grid motion-stagger">...</div>
```

Apply an entrance to a wrapper, or stagger its children; avoid nesting both. Animate
the small region that changes rather than every row or the entire page after an update.
`motion-pop` is suitable for a future popover; it does not implement popup semantics.
Exiting content must be made `inert` before animation starts. The eventual consumer
owns state, focus restoration, and hiding/unmounting; hide immediately under reduced
motion instead of relying solely on an `animationend` event that will not fire.

New entrance, exit, stagger, navigation transitions, and hover lift run only under
`prefers-reduced-motion: no-preference`. Otherwise entering content is immediately
visible and inert exits are immediately transparent. Existing buttons also remove
press movement and transitions when reduced motion is requested. Focusing within
entrances/staggered groups cancels animation so keyboard access never waits.
Print rules remove entrance animation and omit inert exits.

Animate opacity and individual translate/scale properties for entrances, without
animating layout dimensions or adding an animation library. Keep feedback in the
control's base style so hover-out works too. Avoid `transition-all`, continuous
decorative loops, flashing alerts, and status conveyed through motion alone.
No scroll listener, hidden-until-JavaScript reveal, or page transition is added.

## Validation

Run the frontend lint, formatting, and production-build commands in `README.md`.
Normal text token pairs target WCAG AA contrast (4.5:1); control outlines/focus rings
target 3:1. Test future pages at 320px, tablet/desktop widths, 200% zoom, keyboard-only,
and reduced-motion settings. The homepage has been verified in headless Chrome at
320, 390, 820, 1024, and 1440px, without horizontal overflow. Browser checks cover image
loading, modal bounds, filters, copy/review actions, Escape dismissal, FAQs, mobile
navigation, keyboard entry, and reduced motion. Desktop/mobile/dialog screenshots
were visually reviewed. This verifies a local sample experience, not live integrations.


## Dashboard panels

Inbox pagination is a fixed flex footer outside the scrolling email list, so it stays
at the bottom of the panel even for short pages. The reader keeps its header outside
its scrolling content. Both inner scroll areas use `theme-scrollbar` with paper tracks,
charcoal thumbs, rounded WebKit styling, a stable gutter, and native forced-color fallback.
Panel loading uses a centered circular indicator; descriptive labels remain available
to screen readers without visible loading text.
