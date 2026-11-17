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
    'Your edited reply is ready to paste.',
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
    await screen.findByText(
      'Please select the reply text and copy it manually.',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Copy suggested reply' }),
  ).toBeEnabled()
  expect(
    screen.queryByRole('button', { name: 'Reply copied' }),
  ).not.toBeInTheDocument()
})

it('copies edits, resets copy feedback, and disables copying blank replies', async () => {
  const user = userEvent.setup()
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  render(<SuggestedReply reply={reply} />)
  await user.click(screen.getByText('Suggested reply'))
  const editor = screen.getByRole('textbox', { name: 'AI-generated reply' })
  await user.clear(editor)
  expect(
    screen.getByRole('button', { name: 'Copy suggested reply' }),
  ).toBeDisabled()
  await user.type(editor, 'Hello,\n\nMy edited response.')
  await user.click(screen.getByRole('button', { name: 'Copy suggested reply' }))
  expect(write).toHaveBeenCalledWith('Hello,\n\nMy edited response.')
  await user.type(editor, ' Thanks!')
  expect(
    screen.getByRole('button', { name: 'Copy suggested reply' }),
  ).toBeEnabled()
  expect(screen.getByText(/Edits are temporary/)).toBeVisible()
})

it('retains local edits on rerender and resets for a different analysis identity', async () => {
  const user = userEvent.setup()
  const { rerender } = render(
    <SuggestedReply key="email:analysis-1" reply={reply} />,
  )
  await user.click(screen.getByText('Suggested reply'))
  await user.clear(screen.getByRole('textbox'))
  await user.type(screen.getByRole('textbox'), 'Local edit')
  rerender(<SuggestedReply key="email:analysis-1" reply={reply} />)
  expect(screen.getByRole('textbox')).toHaveValue('Local edit')
  rerender(<SuggestedReply key="email:analysis-2" reply="New suggestion" />)
  await user.click(screen.getByText('Suggested reply'))
  expect(screen.getByRole('textbox')).toHaveValue('New suggestion')
})
