import { Link } from 'react-router'

export function PolicyLinks() {
  return (
    <nav aria-label="Legal" className="flex flex-wrap gap-x-5 text-sm">
      <Link
        to="/privacy"
        className="inline-flex min-h-11 items-center underline"
      >
        Privacy policy
      </Link>
      <Link to="/terms" className="inline-flex min-h-11 items-center underline">
        Terms of service
      </Link>
    </nav>
  )
}
