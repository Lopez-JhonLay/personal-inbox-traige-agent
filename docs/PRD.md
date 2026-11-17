# Mailkind

## Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Planning  
**Project Type:** AI-Powered Web Application

---

## 1. Product Overview

### Description

Mailkind is an AI-powered web application that helps users manage their Gmail inbox by automatically analyzing incoming emails, identifying important messages, and recommending appropriate actions.

The application connects directly to a user's Gmail account through Google OAuth, eliminating the need to manually input emails.

Using an AI model, the system summarizes emails, classifies their importance, detects deadlines and requested actions, and generates suggested replies when necessary.

The application follows a **Human-in-the-Loop** approach, meaning the AI can analyze, recommend, and prepare responses but cannot send, delete, or archive emails without the user's explicit approval.

### Problem Statement

Managing emails manually can be time-consuming, especially when important messages are mixed with newsletters, promotions, notifications, and other communications.

Users may overlook important deadlines, forget to respond to messages, or spend unnecessary time reading emails that do not require immediate attention.

### Proposed Solution

Build an intelligent personal email assistant that automatically retrieves Gmail messages, understands their contents, prioritizes them, and presents actionable information through a simple dashboard.

---

## 2. Product Goals

The application aims to:

1. Reduce the time users spend reviewing emails.
2. Automatically identify important and time-sensitive messages.
3. Summarize long emails into concise, understandable information.
4. Extract deadlines, requested actions, and relevant details.
5. Help users identify messages that require a response.
6. Generate suggested replies without automatically sending them.
7. Track pending actions and unanswered messages.
8. Provide a centralized dashboard for managing email priorities.

---

## 3. Target Users

The application is designed for individuals who regularly use Gmail and want to manage their inbox more efficiently.

**Initial Target:** Personal use with a single connected Gmail account.

**Future Target:** Support multiple users and Gmail accounts.

---

## 4. Core Features (MVP)

### 4.1 Gmail Integration

- Connect a Gmail account using Google OAuth 2.0.
- Securely retrieve emails using the Gmail API.
- Automatically fetch recent messages after authorization.
- Allow users to manually synchronize new messages.
- Prevent duplicate email processing.
- Allow users to disconnect their Gmail account.
- Use read-only Gmail access for the initial version.

### 4.2 AI Email Analysis

The AI analyzes each email and provides:

| Feature          | Description                                  |
| ---------------- | -------------------------------------------- |
| Summary          | Short, 1–2 sentence explanation of the email |
| Category         | Classification based on the email's purpose  |
| Priority         | High, Medium, or Low                         |
| Deadline         | Detected due date, if applicable             |
| Requested Action | What the sender wants the recipient to do    |
| Suggested Action | What the AI recommends doing next            |
| Reply Needed     | Whether the message requires a response      |
| Draft Reply      | Optional AI-generated suggested response     |

**Email Categories:**

- Work
- Personal
- Finance
- Meetings
- Notifications
- Promotions
- Newsletters
- Other

**Priority Levels:**

- **High:** Important or time-sensitive messages requiring immediate attention.
- **Medium:** Messages requiring attention but without immediate urgency.
- **Low:** Informational, promotional, or nonurgent messages.

Priority should be determined by the meaning and context of the message, not simply by keywords such as "urgent."

### 4.3 Inbox Dashboard

A simple dashboard displaying:

- Connected Gmail account.
- Total analyzed emails.
- High-priority email count.
- Emails requiring replies.
- Pending actions.
- Email summaries and classifications.
- Email details and suggested actions.

**Filtering Options:**

- Priority
- Category
- Reply needed
- Pending actions

### 4.4 AI-Generated Replies

- Generate suggested replies when appropriate.
- Use a concise, friendly, and professional default tone.
- Allow users to review, edit, and copy suggested replies.
- Never automatically send emails.
- Avoid inventing commitments, confirmations, or completed actions.

### 4.5 Action Tracking

Allow users to track tasks identified from emails.

**Action Statuses:**

- Pending
- In Progress
- Completed
- Dismissed

Users can manually update action statuses without modifying the original Gmail message.

During user-started analysis/reanalysis, the model may request the backend's scoped
`add_action` tool for a clear outstanding obligation. This creates at most one Pending
task for an email that has no existing tasks. Informational messages, promotions, vague
suggestions, and resolved work do not qualify. Existing tasks, including Completed and
Dismissed, stay unchanged. Manual creation remains available. This authorization covers
internal task tracking only; it does not authorize sending messages or executing the task.

---

## 5. Application Workflow

```text
User Connects Gmail
        |
        v
Google OAuth Authorization
        |
        v
Fetch Emails via Gmail API
        |
        v
AI Analyzes Email Content
        |
        v
Generate Structured Analysis
        |
        v
Store Results in Database
        |
        v
Display Results in Dashboard
        |
        v
User Reviews Suggested Actions
```

### Example AI Analysis

**Incoming Email:**

> Subject: Payment Reminder
>
> Your electricity bill of ₱2,450 is due on November 15, 2026. Please settle the payment before the deadline.

**Expected Output:**

```json
{
  "summary": "Your electricity bill of ₱2,450 is due on November 15, 2026.",
  "category": "Finance",
  "priority": "High",
  "deadline": "2026-11-15",
  "requested_action": "Pay the electricity bill.",
  "suggested_action": "Verify the bill and arrange payment before the deadline.",
  "reply_needed": false,
  "draft_reply": null
}
```

The AI should return structured and validated results to ensure consistent processing.

---

## 6. Technology Stack

| Component         | Technology                            |
| ----------------- | ------------------------------------- |
| Frontend          | React + TypeScript + Vite             |
| Backend           | Python + Flask                        |
| AI SDK            | OpenAI Python SDK                     |
| AI Provider       | OpenRouter (Free Model)               |
| Email Integration | Gmail API                             |
| Authentication    | Google OAuth 2.0                      |
| Database          | Neon PostgreSQL                       |
| Data Validation   | Pydantic                              |
| Deployment        | Vercel (Frontend and initial Backend) |
| Version Control   | Git + GitHub                          |

**Technical Considerations:**

- The AI model should be configurable and replaceable.
- Free models may have rate limits and availability restrictions.
- The backend must handle AI failures and invalid responses.
- The application should avoid processing unchanged emails repeatedly.
- A separate worker may be needed later for scheduled or long-running tasks.

---

## 7. Security and Privacy

Since the application handles personal emails, security and privacy are essential.

### Requirements

- Use Google OAuth instead of collecting Gmail passwords.
- Request read-only Gmail permissions for the MVP.
- Securely store authentication credentials and tokens.
- Never expose API keys or OAuth tokens to the frontend.
- Minimize unnecessary storage of sensitive email content.
- Review third-party AI provider privacy and data-retention policies before processing real emails.
- Treat email content as untrusted input to prevent prompt injection.
- Allow users to disconnect their Gmail accounts.
- Never execute sensitive actions without explicit user approval.

### Human-in-the-Loop Rule

**The AI is allowed to:**

- Read authorized emails.
- Summarize and classify messages.
- Detect deadlines and requested actions.
- Recommend next steps.
- Generate suggested replies.

**The AI is NOT allowed to automatically:**

- Send emails.
- Delete emails.
- Archive messages.
- Modify Gmail labels.
- Make payments.
- Perform actions on external services.

---

## 8. Future Enhancements

The following features are planned after the MVP:

- **Automatic Inbox Monitoring:** Periodically synchronize and analyze new emails.
- **Daily Digest:** Generate a summary of important emails and pending actions.
- **Personalized Rules:** Allow users to define preferred senders, priority rules, and response styles.
- **Follow-Up Reminders:** Notify users about upcoming deadlines and unanswered messages.
- **Thread Awareness:** Analyze previous conversations to understand email context.
- **Google Calendar Integration:** Check availability for meeting-related emails.
- **Gmail Draft Integration:** Save approved reply drafts directly to Gmail.
- **Agent Tool Calling:** Allow the AI to use approved tools to retrieve relevant information.
- **Multi-Account Support:** Connect and manage multiple Gmail accounts.

---

## 9. MVP Success Criteria

The MVP is considered complete when:

- [ ] Users can securely connect and disconnect Gmail.
- [ ] The application automatically retrieves recent Gmail messages after authorization.
- [ ] The AI generates accurate email summaries.
- [ ] Emails receive appropriate categories and priorities.
- [ ] Deadlines and requested actions are detected when available.
- [ ] The system identifies emails requiring replies.
- [ ] The AI generates optional suggested responses.
- [ ] Users can view and filter analyzed emails.
- [ ] Users can manage pending action statuses.
- [ ] Email analyses are stored in Neon PostgreSQL.
- [ ] Invalid AI responses and API failures are handled gracefully.
- [ ] The application never performs unauthorized email operations.
- [ ] The application can run locally and be deployed.

---

## 10. Project Scope and Limitations

### Included in MVP

- Single Gmail account connection.
- Read-only Gmail integration.
- Manual email synchronization.
- AI-powered email analysis.
- Email dashboard.
- Suggested reply generation.
- Basic action tracking.
- Persistent database storage.

### Excluded from MVP

- Automatic email sending.
- Gmail message deletion or archiving.
- Scheduled background synchronization.
- Calendar integration.
- Multi-account support.
- Autonomous external actions.
- Complex multi-agent systems.

---

## 11. Product Vision

The long-term vision is to transform Mailkind from a simple AI-powered email analyzer into a proactive personal assistant.

Instead of manually reviewing every incoming email, users should be able to open a dashboard and immediately understand:

- What needs attention today?
- Which emails require a response?
- What deadlines are approaching?
- What actions are still pending?
- What responses can the AI help prepare?

The ultimate goal is to create an intelligent email assistant that reduces inbox management effort while keeping users informed and fully in control.

---

**Document Version:** 1.0  
**Status:** Ready for Development Planning
