'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import type { IntegrationStatus, BaptismStatus } from '@/types'

export async function startPostDiscipleship(caseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Não autorizado' }

  const { error } = await supabase.rpc('start_post_discipleship', {
    p_case_id: caseId,
    p_created_by: profile.id,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePostDiscipleship(
  caseId: string,
  integrationStatus: IntegrationStatus,
  baptismStatus: BaptismStatus,
  departmentName: string | undefined,
  notes: string | undefined
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('post_discipleship')
    .upsert({
      case_id: caseId,
      integration_status: integrationStatus,
      baptism_status: baptismStatus,
      department_name: departmentName || null,
      notes: notes || null,
      updated_by: profile.id,
    }, { onConflict: 'case_id' })

  if (error) return { error: error.message }

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: 'POS_DISCIPULADO',
    description: 'Acompanhamento pós-discipulado atualizado',
    metadata: { integration_status: integrationStatus, baptism_status: baptismStatus },
    created_by: profile.id,
  })

  return { success: true }
}

export async function confirmDepartmentContact(caseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('post_discipleship')
    .update({
      department_contacted_at: new Date().toISOString(),
      department_contacted_by: profile.id,
      integration_status: 'INTEGRADO',
      updated_by: profile.id,
    })
    .eq('case_id', caseId)

  if (error) return { error: error.message }

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: 'POS_DISCIPULADO',
    description: 'Departamento confirmou contato com o discipulando',
    metadata: { confirmed_by: profile.id },
    created_by: profile.id,
  })

  return { success: true }
}

export async function getPostDiscipleshipCases(congregationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discipleship_cases')
    .select(`
      *,
      disciples ( id, full_name, phone ),
      profiles!assigned_to ( id, name ),
      post_discipleship (*)
    `)
    .eq('congregation_id', congregationId)
    .eq('status', 'CONCLUIDO')
    .order('updated_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}
