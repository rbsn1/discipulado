import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDepartments } from '@/lib/repositories/departments'
import { redirect } from 'next/navigation'
import { DepartamentosClient } from './client'

export default async function DepartamentosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) redirect('/admin')

  const departments = await getDepartments(profile.congregation_id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <DepartamentosClient departments={departments} />
    </div>
  )
}
