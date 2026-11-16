export type DemoMessage = {
  id: string
  sender: string
  initials: string
  category: 'Work' | 'Finance' | 'Newsletter'
  priority: 'High' | 'Low'
  subject: string
  preview: string
  summary: string
  action: string
  time: string
  needsReply: boolean
  draft?: string
}
