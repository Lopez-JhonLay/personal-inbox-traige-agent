import type { DemoMessage } from '../types/demo'

// Fictional content for the homepage preview. No inbox or AI service is called.
export const demoMessages: DemoMessage[] = [
  {
    id: 'project-feedback',
    sender: 'Maya Chen',
    initials: 'MC',
    category: 'Work',
    priority: 'High',
    subject: 'Feedback on the project draft',
    preview: 'Please send your comments by Friday.',
    summary:
      'Maya shared the first project draft and would like your feedback by Friday. A short reply will help her plan the next round.',
    action: 'Review the draft and let Maya know when you can send feedback.',
    time: '9:41 AM',
    needsReply: true,
    draft:
      'Hi Maya, thanks for sharing the first draft. I’ll take a look and get back to you with an update on timing.',
  },
  {
    id: 'billing-reminder',
    sender: 'Luma Billing',
    initials: 'LB',
    category: 'Finance',
    priority: 'High',
    subject: 'Workspace invoice due Thursday',
    preview: 'Your monthly invoice is ready to review.',
    summary:
      'A reminder that your monthly workspace invoice is due Thursday. No reply is requested.',
    action: 'Check the invoice details and payment date.',
    time: '8:30 AM',
    needsReply: false,
  },
  {
    id: 'weekend-reading',
    sender: 'The Sunday Edit',
    initials: 'SE',
    category: 'Newsletter',
    priority: 'Low',
    subject: 'This week’s reading list',
    preview: 'Articles on design, photography, and writing.',
    summary:
      'A collection of articles and creative inspiration for the weekend. There is no deadline or requested action.',
    action: 'Save it for when you have a quiet moment.',
    time: 'Yesterday',
    needsReply: false,
  },
]
