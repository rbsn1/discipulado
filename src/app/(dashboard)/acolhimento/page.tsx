import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getCases } from '@/lib/repositories/cases'
import { getProfilesByCongregation } from '@/lib/repositories/profiles'
import { getDisciplesLite } from '@/lib/repositories/disciples'
import { redirect } from 'next/navigation'
import { AcolhimentoClient } from './client'

export default async function AcolhimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string; search?: string; discipulador?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (profile.role === 'SECRETARIA_DISCIPULADO') redirect('/pos-discipulado')

  const { status, filter, search, discipulador } = await searchParams

  // Jornada = só quem está com trabalho em andamento. Concluído não entra
  // mais aqui — quem já concluiu é assunto do Pós-discipulado (/pos-discipulado),
  // não da fila de trabalho da Jornada. Isso também corrige de graça um caso
  // que antes ficava estranho: alguém com case concluído podia legitimamente
  // começar um novo acolhimento (a RPC só bloqueia se já tem case ATIVO), mas
  // aparecia preso como "já tem case" só por causa do histórico concluído.
  const [allCases, discipuladores, disciples] = await Promise.all([
    getCases(profile.congregation_id, {
      search,
      status: ['EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'],
    }),
    getProfilesByCongregation(profile.congregation_id),
    getDisciplesLite(profile.congregation_id),
  ])

  const discipuladoresAtivos = discipuladores.filter(
    p => ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(p.role) && p.is_active
  )

  // Acolhedor só vê a fila pessoal dele: casos já atribuídos a ele + os que
  // ainda não têm responsável (pra poder se atribuir). Outros papéis (SM,
  // Admin) continuam vendo a fila inteira, pra poder distribuir os casos.
  // Restrição só nesta tela — /discipulandos e o resto do app continuam
  // mostrando todos os cases da congregação pra qualquer papel com acesso.
  const cases = profile.role === 'DISCIPULADOR'
    ? allCases.filter(c => !c.assigned_to || c.assigned_to === profile.id)
    : allCases

  // Discipulandos sem case ativo para o modal de iniciar acolhimento — usa a
  // lista COMPLETA de cases ativos (não a filtrada acima), senão um
  // discipulando já atribuído a outro acolhedor apareceria aqui como "sem
  // case" por engano.
  const casedDiscipleIds = new Set(allCases.map(c => c.disciple_id))
  const disciplesSemCase = disciples.filter(d => !casedDiscipleIds.has(d.id))

  return (
    <div className="p-4 md:p-6">
      <AcolhimentoClient
        cases={cases}
        discipuladores={discipuladoresAtivos}
        disciplesSemCase={disciplesSemCase}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        currentRole={profile.role}
        initialStatus={status}
        initialFilter={filter}
        initialSearch={search}
        initialDiscipulador={discipulador}
      />
    </div>
  )
}
