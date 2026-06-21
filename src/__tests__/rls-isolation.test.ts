/**
 * Testes de isolamento por congregação (RLS).
 *
 * Estes são testes de integração que requerem um banco Supabase local
 * com as migrations e seed aplicados. Eles provam que um usuário da
 * congregação A não consegue ler dados da congregação B.
 *
 * Para executar: `npm run test:integration`
 * Variáveis necessárias: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * e os usuários do seed.sql presentes no banco.
 *
 * IMPORTANTE: Estes testes usam as credenciais do seed.sql de DEV.
 * Nunca execute contra produção.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const CENTRAL_ID = '11111111-1111-1111-1111-111111111111'
const NORTE_ID = '22222222-2222-2222-2222-222222222222'

// Credenciais do seed
const CENTRAL_ADMIN = { email: 'admin@central.dev', password: 'senha123' }
const NORTE_ADMIN = { email: 'admin@norte.dev', password: 'senha123' }

function makeClient() {
  return createClient(SUPABASE_URL, ANON_KEY)
}

describe.skipIf(!SUPABASE_URL)('RLS: isolamento por congregação', () => {
  let centralClient: ReturnType<typeof makeClient>
  let norteClient: ReturnType<typeof makeClient>

  beforeAll(async () => {
    centralClient = makeClient()
    norteClient = makeClient()

    await centralClient.auth.signInWithPassword(CENTRAL_ADMIN)
    await norteClient.auth.signInWithPassword(NORTE_ADMIN)
  })

  it('admin da Central não vê módulos da Norte', async () => {
    const { data } = await centralClient
      .from('module_templates')
      .select('id, congregation_id')
      .eq('congregation_id', NORTE_ID)

    expect(data).toHaveLength(0)
  })

  it('admin da Norte não vê módulos da Central', async () => {
    const { data } = await norteClient
      .from('module_templates')
      .select('id, congregation_id')
      .eq('congregation_id', CENTRAL_ID)

    expect(data).toHaveLength(0)
  })

  it('admin da Central vê seus próprios módulos', async () => {
    const { data, error } = await centralClient
      .from('module_templates')
      .select('id, congregation_id')
      .eq('congregation_id', CENTRAL_ID)

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    data!.forEach(m => expect(m.congregation_id).toBe(CENTRAL_ID))
  })

  it('admin da Norte vê seus próprios módulos', async () => {
    const { data, error } = await norteClient
      .from('module_templates')
      .select('id, congregation_id')
      .eq('congregation_id', NORTE_ID)

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    data!.forEach(m => expect(m.congregation_id).toBe(NORTE_ID))
  })

  it('admin da Central não vê turmas da Norte', async () => {
    const { data } = await centralClient
      .from('classes')
      .select('id, congregation_id')
      .eq('congregation_id', NORTE_ID)

    expect(data).toHaveLength(0)
  })

  it('admin da Norte não pode inserir módulo na Central (RLS bloqueia)', async () => {
    const { error } = await norteClient
      .from('module_templates')
      .insert({
        congregation_id: CENTRAL_ID,
        title: 'Módulo Invasão',
        sort_order: 99,
      })

    // RLS deve bloquear — espera-se erro ou zero linhas afetadas
    expect(error).not.toBeNull()
  })

  it('admin da Central não pode criar case de discipulando da Norte', async () => {
    // Tenta inserir um discípulo diretamente na Central com congregation_id da Norte
    const { error } = await centralClient
      .from('disciples')
      .insert({
        congregation_id: NORTE_ID,
        full_name: 'Invasor Teste',
      })

    expect(error).not.toBeNull()
  })
})
