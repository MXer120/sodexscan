import CopyLayout from '../components/copy/CopyLayout'

export const metadata = {
  title: 'Copy Trading | CommunityScan SoDEX',
  description: 'Follow top Sodex traders, track wallets, build cohorts, and receive real-time signals.',
}

export default function CopyPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <CopyLayout />
    </div>
  )
}
