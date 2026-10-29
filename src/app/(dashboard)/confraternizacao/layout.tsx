import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { isFbvEnabled } from '@/lib/repositories/congregations'

// Festa de Boas Vindas desligada em /admin/boas-vindas: some do menu e
// quem chegar pelo endereço volta pro painel. Os dados continuam no banco.
export default async function ConfraternizacaoLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (profile?.congregation_id && !(await isFbvEnabled(profile.congregation_id))) {
    redirect('/painel')
  }
  return children
}
