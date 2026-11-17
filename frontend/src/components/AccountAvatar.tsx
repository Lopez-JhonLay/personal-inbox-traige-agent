import { useState } from 'react'

export function AccountAvatar({
  name,
  email,
  pictureUrl,
}: {
  name?: string | null
  email?: string | null
  pictureUrl?: string | null
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const words = (name?.trim() || email?.split('@')[0] || 'Account')
    .split(/[\s._-]+/)
    .filter(Boolean)
  const first = words[0] ?? 'Account'
  const initials =
    words.length > 1 ? `${first[0]}${words[1][0]}` : first.slice(0, 2)
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-ink bg-highlight text-sm font-semibold text-ink"
    >
      {pictureUrl && pictureUrl !== failedUrl ? (
        <img
          src={pictureUrl}
          alt=""
          referrerPolicy="no-referrer"
          width="40"
          height="40"
          className="size-full object-cover"
          onError={() => setFailedUrl(pictureUrl)}
        />
      ) : (
        initials.toUpperCase()
      )}
    </span>
  )
}
