<p align="center">
  <img src="frontend/public/images/mailkind-logo.png" alt="Mailkind" width="72" />
</p>

<h1 align="center">Mailkind</h1>

<p align="center">
  <strong>Know what needs your attention.</strong><br />
  Your AI inbox assistant for understanding emails, keeping track of requests,<br />
  and finding a clear next step.
</p>

<p align="center">
  <a href="https://mailkind-web-lopez-jhonlays-projects.vercel.app/"><strong>Try Mailkind &rarr;</strong></a>
  &nbsp;&nbsp;&middot;&nbsp;&nbsp;
  <a href="#meet-your-inbox-workspace">Explore the product</a>
  &nbsp;&nbsp;&middot;&nbsp;&nbsp;
  <a href="https://mailkind-web-lopez-jhonlays-projects.vercel.app/privacy">Privacy</a>
</p>

<p align="center">
  <img src="frontend/public/images/mailkind-workspace.png" alt="Mailkind workspace illustration with an envelope, laptop, and follow-up checklist" width="640" />
</p>

---

## A clearer way to work through email

A request to review a document. A bill approaching its due date. A message that needs
a thoughtful reply. Mailkind brings the important details together so you can decide
what to handle next.

Connect Gmail and turn selected messages into readable summaries, useful context,
and follow-ups you can track.

| Understand the message                                                           | See what matters                                            | Take the next step                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| Read a short summary and return to the original email whenever you need context. | Spot priorities, deadlines, and requests that need a reply. | Track a task or edit a suggested reply before copying it. |

## Meet your inbox workspace

### Read with context

Keep your email list and message details together. Scan a summary, check the deadline,
and expand the original message without losing your place. On mobile, the reader
opens full-width so you can focus on one email at a time.

### Find the emails that need you

Filter by priority, category, reply needs, analysis status, or pending actions. Sort
your inbox by priority or received date and work through it in the order that suits you.

### Let clear requests become follow-ups

During analysis, Mailkind's AI can recognize an outstanding request and add it to
Actions. Informational messages and promotional suggestions do not automatically
deserve a task. You can also add a follow-up yourself.

Keep work **Pending**, move it **In Progress**, or mark it **Completed** or
**Dismissed**. Reanalyzing an email preserves its existing tasks.

### Start a reply with something useful

Review a suggested reply, put it in your own words, and copy it when you're ready.
You choose what to send from Gmail. Mailkind never sends a reply for you.

## From inbox to next step

1. **Connect Gmail.** Sign in with the account you want to review.
2. **Choose when to analyze.** Sync up to 20 matching inbox messages at a time.
3. **Review the details.** Check the summary, priority, deadline, and requested action.
4. **Follow through.** Update your tasks or copy an edited reply into your own workflow.

Finished results stay saved, so you can return to your inbox and pick up where you
left off. Unfinished or failed analyses have controls to continue or try again.

## An assistant that leaves the decisions with you

- **Read-only Gmail access.** Your messages are never sent, deleted, archived, or relabeled by Mailkind.
- **You start the analysis.** Opening the app or browsing saved emails does not trigger AI processing.
- **Tasks track work.** Adding a task does not perform the action described in the email.
- **Your review matters.** AI summaries, dates, and replies can be inaccurate. Check the source before acting.

Email analysis shares selected message content with OpenRouter and its upstream AI
provider. Saved emails and tasks remain after logout or disconnection; account-data
deletion is available by contacting the operator. Read the
[privacy policy](https://mailkind-web-lopez-jhonlays-projects.vercel.app/privacy)
for data handling and retention details.

---

## Try Mailkind

**[Open your inbox workspace &rarr;](https://mailkind-web-lopez-jhonlays-projects.vercel.app/)**

Mailkind is a live MVP. To try the current hosted version, add the `mailkind-test`
label to fictional messages in your Gmail inbox, then choose **Sync inbox**.

Google sign-in is published but unverified, so you may see Google's unverified-app
warning. Access remains subject to Google's 100-user cap. AI service limits may
temporarily pause processing, and reply edits should be copied before leaving the email.

[Privacy policy](https://mailkind-web-lopez-jhonlays-projects.vercel.app/privacy)
&middot;
[Terms of service](https://mailkind-web-lopez-jhonlays-projects.vercel.app/terms)
&middot;
[Contact](mailto:jhonlaylopez000@gmail.com)

## Behind the product

Built with **React, TypeScript, and Tailwind CSS**, powered by a **Flask** backend,
**OpenRouter** for AI, and **Neon PostgreSQL** for saved emails and tasks. Hosted on
**Vercel**.

[Run locally](docs/DEVELOPMENT.md)
&middot;
[Architecture](docs/ARCHITECTURE.md)
&middot;
[Design system](docs/DESIGN_SYSTEM.md)
&middot;
[Roadmap](docs/TASKS.md)
&middot;
[Contributing](AGENTS.md)

<p align="center">
  <sub>Mailkind &middot; A little clarity for your inbox.</sub>
</p>
