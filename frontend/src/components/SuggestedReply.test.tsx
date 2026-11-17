import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SuggestedReply } from './SuggestedReply'

const reply =
  'Hello Maya,\n\nThank you for the proposal. Which section needs feedback?\n\nBest regards,'

it('copies the full reply with paragraph breaks and confirms success', async () => {
  const user = userEvent.setup()
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  render(<SuggestedReply reply={reply} />)
  await user.click(screen.getByText('Suggested reply'))
  await user.click(screen.getByRole('button', { name: 'Copy suggested reply' }))
  expect(write).toHaveBeenCalledWith(reply)
  expect(
    await screen.findByRole('button', { name: 'Reply copied' }),
  ).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reply copied to clipboard.',
  )
})

it('keeps the reply readable and offers manual copying if clipboard access fails', async () => {
  const user = userEvent.setup()
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
    new Error('Denied'),
  )
  render(<SuggestedReply reply={reply} />)
  await user.click(screen.getByText('Suggested reply'))
  await user.click(screen.getByRole('button', { name: 'Copy suggested reply' }))
  expect(
    await screen.findByText('Couldn’t copy. Please select and copy the reply.'),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Copy suggested reply' }),
  ).toBeEnabled()
  expect(
    screen.queryByRole('button', { name: 'Reply copied' }),
  ).not.toBeInTheDocument()
})
