import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Mail,
  Menu,
  Plus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { InboxPreview } from '../components/InboxPreview'

const navigation = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Your control', href: '#the-details' },
  { label: 'FAQs', href: '#questions' },
]
const steps = [
  {
    number: '01',
    title: 'Read the summary',
    description:
      'See what the sender is asking for without reading the message twice.',
    tone: 'bg-accent-soft',
  },
  {
    number: '02',
    title: 'Check what needs attention',
    description:
      'Look at the priority, deadline, and whether a reply is needed.',
    tone: 'bg-highlight',
  },
  {
    number: '03',
    title: 'Choose your next step',
    description:
      'Review the request, copy a suggested reply, or leave it for later.',
    tone: 'bg-success-soft',
  },
]
const questions = [
  {
    question: 'What does “reviewed” mean?',
    answer:
      'It marks a message as checked. Choose Undo review to change it back.',
  },
  {
    question: 'Can I change the suggested reply?',
    answer:
      'Copy the draft, paste it into your email editor, and edit it before sending.',
  },
  {
    question: 'Will my changes be saved?',
    answer: 'Your review choices last until you reload or close the page.',
  },
]
const details = [
  {
    title: 'Check the details',
    text: 'Treat priorities and deadlines as suggestions. Read the source email before acting.',
  },
  {
    title: 'Write in your own words',
    text: 'Use a suggested reply as a starting point, then adjust it to suit the conversation.',
  },
  {
    title: 'Keep the final say',
    text: 'Marking a message as reviewed never sends a reply.',
  },
]

function Brand() {
  return (
    <a
      href="#top"
      className="inline-flex items-center gap-3 text-ink no-underline"
      aria-label="Mailkind home"
    >
      <span className="grid size-10 -rotate-6 place-items-center rounded-control border-2 border-ink bg-highlight shadow-press">
        <Mail aria-hidden="true" className="size-6" />
      </span>
      <span className="font-display text-xl font-bold tracking-[-0.055em]">
        Mailkind
      </span>
    </a>
  )
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-24 rounded-control bg-ink px-4 py-3 font-semibold text-surface focus:translate-y-0"
      >
        Skip to content
      </a>
      <header id="top" className="relative z-20 border-b border-line">
        <div className="page-container flex min-h-24 flex-wrap items-center justify-between gap-4 py-4">
          <Brand />
          <nav
            aria-label="Main navigation"
            id="main-navigation"
            className={`${menuOpen ? 'flex' : 'hidden'} order-3 w-full flex-col items-start gap-1 border-t border-line pt-3 lg:order-none lg:flex lg:w-auto lg:flex-row lg:gap-5 lg:border-0 lg:pt-0`}
          >
            {navigation.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="nav-link px-2 text-[13px]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a
            href="#sample-inbox"
            className="button hidden text-sm sm:inline-flex"
          >
            Try the demo
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
          <button
            type="button"
            className="button button-secondary button-icon lg:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false)
            }}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section
          className="page-container grid items-center gap-10 pb-16 pt-12 md:pb-20 md:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-20"
          aria-labelledby="hero-title"
        >
          <div className="motion-enter">
            <h1
              id="hero-title"
              className="font-display text-[clamp(2.5rem,4.8vw,4.25rem)] leading-[1.1] tracking-[-0.055em]"
            >
              See what needs
              <br />
              <span className="relative isolate inline-block">
                your attention.
                <svg
                  viewBox="0 0 340 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute -bottom-1 -left-1 -z-10 h-5 w-[105%] text-highlight"
                >
                  <path
                    d="M6 12Q150 1 333 9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-[25rem] text-base leading-[1.8] text-muted">
              Read a summary, spot a deadline, and decide what to handle first.
            </p>
            <div className="mt-8 cluster gap-4">
              <a href="#sample-inbox" className="button text-sm">
                Try the demo
                <ArrowDown aria-hidden="true" className="size-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-4"
              >
                How it works
              </a>
            </div>
          </div>
          <InboxPreview />
        </section>
        <section
          id="how-it-works"
          className="content-container section-space scroll-mt-8"
          aria-labelledby="how-title"
        >
          <header className="mx-auto max-w-2xl text-center">
            <h2
              id="how-title"
              className="text-[clamp(2rem,3.5vw,3rem)] tracking-[-0.05em]"
            >
              From message to next step.
            </h2>
          </header>
          <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((step) => (
              <article
                key={step.number}
                className="relative border-t-2 border-ink pt-6"
              >
                <span
                  className={`mb-6 grid size-14 place-items-center rounded-panel border-2 border-ink font-mono text-lg font-semibold shadow-press ${step.tone}`}
                >
                  {step.number}
                </span>
                <h3 className="text-2xl tracking-[-0.04em]">{step.title}</h3>
                <p className="mt-3 text-sm leading-[1.8] text-muted">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="the-details"
          className="page-container section-space grid items-center gap-12 scroll-mt-8 lg:grid-cols-2 lg:gap-20"
          aria-labelledby="details-title"
        >
          <figure>
            <div className="overflow-hidden rounded-panel border-2 border-ink bg-surface shadow-panel">
              <img
                src="/images/quiet-workspace.jpg"
                width="1400"
                height="933"
                alt="Notebook, coffee, and a laptop on a wooden desk"
                loading="lazy"
                className="aspect-[6/5] w-full object-cover"
              />
            </div>
          </figure>
          <div>
            <h2
              id="details-title"
              className="text-[clamp(2rem,3.5vw,3rem)] tracking-[-0.05em]"
            >
              You’re still in charge.
            </h2>
            <p className="mt-5 text-sm leading-[1.8] text-muted">
              Use the summary to decide what to read, reply to, or leave for
              later.
            </p>
            <div className="mt-8 stack gap-6">
              {details.map((detail) => (
                <div key={detail.title} className="border-l-2 border-line pl-4">
                  <h3 className="font-sans text-sm font-bold tracking-normal">
                    {detail.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {detail.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="questions"
          className="content-container section-space grid gap-8 scroll-mt-8 md:grid-cols-[0.7fr_1.3fr] md:gap-16"
          aria-labelledby="faq-title"
        >
          <header>
            <h2
              id="faq-title"
              className="text-[clamp(2rem,3.5vw,3rem)] tracking-[-0.05em]"
            >
              A few questions,
              <br />
              answered.
            </h2>
          </header>
          <div className="border-t-2 border-ink">
            {questions.map((item) => (
              <details
                key={item.question}
                className="group border-b border-line"
              >
                <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <Plus
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  />
                </summary>
                <p className="pb-6 pr-8 text-sm leading-[1.8] text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="page-container pb-12 pt-4 md:pb-16"
          aria-labelledby="closing-title"
        >
          <div className="rounded-panel border-2 border-ink bg-accent-soft px-6 py-12 text-center shadow-press md:py-16">
            <h2
              id="closing-title"
              className="text-[clamp(2.25rem,4.4vw,3.75rem)] tracking-[-0.055em]"
            >
              Start with three emails.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted">
              Open a message to see its summary and suggested next step.
            </p>
            <a href="#sample-inbox" className="button mt-7 text-sm">
              Try the demo
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="page-container flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand />
            <p className="mt-4 text-xs text-muted">
              See what needs your attention.
            </p>
          </div>
          <div className="text-xs text-muted sm:text-right">
            <a
              href="#top"
              className="inline-flex min-h-11 items-center gap-2 text-ink"
            >
              Back to top
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </a>
            <p>© 2026</p>
            <a
              className="mt-1 inline-block text-muted"
              href="https://unsplash.com/s/photos/organised-desk"
              target="_blank"
              rel="noreferrer"
            >
              Photo via Unsplash
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
