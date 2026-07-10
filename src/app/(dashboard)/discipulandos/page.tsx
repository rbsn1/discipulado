import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDisciples } from '@/lib/repositories/disciples'
import { getWorshipServices } from '@/lib/repositories/worship-services'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CASE_STATUS_LABEL, CASE_STATUS_COLOR, formatDate } from '@/lib/utils'
import { DisciplesClientPage } from './client'
import type { DiscipleWithCase } from '@/types'

export default async function DiscipulandosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { search } = await searchParams
  const [disciples, worshipServices] = await Promise.all([
    getDisciples(profile.congregation_id, search),
    getWorshipServices(profile.congregation_id, { activeOnly: true }),
  ])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <DisciplesClientPage
        disciples={disciples}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        search={search}
        worshipServices={worshipServices}
      />
    </div>
  )
}
