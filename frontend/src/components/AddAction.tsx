import { useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useActionMutations } from '../hooks/useActions'
import { useAuthStatus } from '../hooks/useAuth'
import { Button } from './ui/Button'

export function AddAction({
  userId,
  emailId,
  description: suggestion,
  dueDate,
}: {
  userId: string
  emailId: string
  description: string
  dueDate?: string
}) {
  const { create } = useActionMutations(userId)
  const auth = useAuthStatus()
  const authBusy = useIsMutating({ mutationKey: ['auth'] }) > 0
  const dialog = useRef<HTMLDialogElement>(null)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const disabled = authBusy || auth.isError || !auth.data?.authenticated
  return (
    <div className="mt-4">
      <Button
        variant="secondary"
        disabled={disabled || create.isPending}
        onClick={() => {
          setDescription(suggestion)
          setDate(dueDate ?? '')
          create.reset()
          dialog.current?.showModal()
        }}
      >
        Add to Actions
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="add-action-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
        onCancel={(event) => {
          if (create.isPending) event.preventDefault()
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate(
              {
                email_id: emailId,
                description: description.trim(),
                due_date: date || null,
              },
              {
                onSuccess: () => dialog.current?.close(),
              },
            )
          }}
        >
          <h3 id="add-action-title" className="text-xl">
            Add an action
          </h3>
          <p className="mt-2 text-sm text-muted">
            Review the task before adding it. This only saves a task in
            Mailkind.
          </p>
          <label className="mt-4 grid gap-2 text-sm">
            Description
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={description}
              disabled={create.isPending}
              className="w-full rounded-control border border-line bg-surface p-3"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="mt-4 grid gap-2 text-sm">
            Due date (optional)
            <input
              type="date"
              value={date}
              disabled={create.isPending}
              className="min-h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3"
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <div className="cluster mt-5 gap-3">
            <Button
              variant="secondary"
              disabled={create.isPending}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              busy={create.isPending}
              disabled={disabled || create.isPending || !description.trim()}
            >
              Add action
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
