import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getReportStats, getReportCases, getMonthlyStats } from '@/lib/repositories/reports'
import { redirect } from 'next/navigation'
import { RelatoriosClient } from './client'

export default async function RelatoriosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const [stats, cases, monthly] = await Promise.all([
    getReportStats(),
    getReportCases(profile.congregation_id),
    getMonthlyStats(profile.congregation_id),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <RelatoriosClient stats={stats} cases={cases} monthly={monthly} />
    </div>
  )
}
