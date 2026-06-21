import { createClient } from '@/lib/supabase/server'
import type { Event, EventConfirmation } from '@/types'

export async function getEvents(congregationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('date', { ascending: false })

  if (error) throw error
  return data as Event[]
}

export async function getEventById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_confirmations (
        *,
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
  classShift: string | null,
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
      class_shift: classShift,
      created_by: createdBy,
    }, { onConflict: 'event_id,case_id' })

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
