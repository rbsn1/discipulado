import { createClient } from '@/lib/supabase/server'
import type { Event, EventConfirmation } from '@/types'

export interface EventWithCounts extends Event {
  confirmed_count: number
  attended_count: number
}

export async function getEvents(congregationId: string): Promise<EventWithCounts[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_confirmations ( confirmed, attended )
    `)
    .eq('congregation_id', congregationId)
    .order('date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((ev: any) => {
    const confs: { confirmed: boolean; attended: boolean }[] = ev.event_confirmations ?? []
    return {
      ...ev,
      event_confirmations: undefined,
      confirmed_count: confs.filter(c => c.confirmed).length,
      attended_count: confs.filter(c => c.attended).length,
    } as EventWithCounts
  })
}

export async function getEventById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_confirmations (
        *,
        class_shifts ( id, name ),
        discipleship_cases (
          id,
          disciples ( id, full_name, phone ),
          profiles!assigned_to ( id, name )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEvent(
  congregationId: string,
  title: string,
  date: string,
  notes: string | undefined,
  createdBy: string
): Promise<Event> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      congregation_id: congregationId,
      type: 'CONFRATERNIZACAO',
      title,
      date,
      notes: notes || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function updateEvent(
  id: string,
  updates: { title?: string; date?: string; notes?: string | null }
): Promise<Event> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function updateEventStatus(
  id: string,
  status: 'PLANEJADO' | 'REALIZADO' | 'CANCELADO'
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export async function upsertConfirmation(
  eventId: string,
  caseId: string,
  confirmed: boolean,
  attended: boolean,
  classShiftId: string | null,
  createdBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_confirmations')
    .upsert({
      event_id: eventId,
      case_id: caseId,
      confirmed,
      attended,
      class_shift_id: classShiftId,
      created_by: createdBy,
    }, { onConflict: 'event_id,case_id' })

  if (error) throw error
}

export async function removeConfirmation(eventId: string, caseId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_confirmations')
    .delete()
    .eq('event_id', eventId)
    .eq('case_id', caseId)

  if (error) throw error
}

export async function getConfirmationsForEvent(eventId: string): Promise<EventConfirmation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_confirmations')
    .select('*')
    .eq('event_id', eventId)

  if (error) throw error
  return data as EventConfirmation[]
}

export async function getCaseConfraternizacaoInfo(caseId: string): Promise<{
  hasAttended: boolean
  preferredShift: string | null
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_confirmations')
    .select('class_shifts ( name )')
    .eq('case_id', caseId)
    .eq('attended', true)
    .order('created_at', { ascending: false })
    .limit(1)

  return {
    hasAttended: (data?.length ?? 0) > 0,
    preferredShift: (data?.[0] as unknown as { class_shifts: { name: string } | null } | undefined)?.class_shifts?.name ?? null,
  }
}

// Cases que já tiveram presença registrada (attended=true) em algum evento
// de confraternização da congregação — usado pra tirá-los da lista de
// "adicionar participante" de outros eventos, já que uma presença já é
// suficiente pra liberar a matrícula (ver getCaseConfraternizacaoInfo).
export async function getAttendedCaseIds(congregationId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_confirmations')
    .select('case_id, events!inner(congregation_id)')
    .eq('attended', true)
    .eq('events.congregation_id', congregationId)

  if (error) throw error
  return [...new Set((data ?? []).map(r => r.case_id as string))]
}
