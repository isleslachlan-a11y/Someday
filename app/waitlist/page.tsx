import SimpleWaitlistPage from './SimpleWaitlistPage'
import FullWaitlistPage   from './FullWaitlistPage'

export default function WaitlistPage() {
  const showFull = process.env.NEXT_PUBLIC_WAITLIST_FULL === 'true'
  return showFull ? <FullWaitlistPage /> : <SimpleWaitlistPage />
}
