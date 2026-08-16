import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getReportStats, getReportCases, getMonthlyStats, getReportStatsByAssignee } from '@/lib/repositories/reports'
import { redirect } from 'next/navigation'
import { RelatoriosClient } from './client'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  // Só o link do menu era escondido pra outros papéis — a rota em si não
  // checava nada, então dava pra acessar direto pela URL.
  if (!['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) redirect('/painel')

  const { start, end } = await searchParams
  const period = start || end ? { start, end } : undefined

  const [stats, cases, monthly, byAssignee] = await Promise.all([
    getReportStats(period),
    getReportCases(profile.congregation_id, period),
    getMonthlyStats(profile.congregation_id),
    getReportStatsByAssignee(period),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <RelatoriosClient
        stats={stats}
        cases={cases}
        monthly={monthly}
        byAssignee={byAssignee}
        initialStart={start}
        initialEnd={end}
      />
    </div>
  )
}
