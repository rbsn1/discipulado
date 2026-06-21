import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClassById } from '@/lib/repositories/classes'
import { getModuleTemplates } from '@/lib/repositories/modules'
import { redirect, notFound } from 'next/navigation'
import { TurmaDetailClient } from './client'

export default async function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { id } = await params
  const turma = await getClassById(id).catch(() => null)
  if (!turma) notFound()

  const modules = await getModuleTemplates(profile.congregation_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TurmaDetailClient
        turma={turma as any}
        modules={modules}
        currentProfile={profile}
      />
    </div>
  )
}
