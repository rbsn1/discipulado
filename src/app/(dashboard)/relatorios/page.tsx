import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getReportStats, getReportCases } from '@/lib/repositories/reports'
import { redirect } from 'next/navigation'
import { RelatoriosClient } from './client'

export default async function RelatoriosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const [stats, cases] = await Promise.all([
    getReportStats(profile.congregation_id),
    getReportCases(profile.congregation_id),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <RelatoriosClient stats={stats} cases={cases} />
    </div>
  )
}
