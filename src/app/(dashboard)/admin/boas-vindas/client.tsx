'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export function BoasVindasClient({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/fbv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fbv_enabled: !enabled }),
    })
    if (!res.ok) {
      setError((await res.json()).error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Festa de Boas Vindas</h1>
        <p className="mt-1 text-sm text-gray-500">
          A Festa de Boas Vindas não é mais obrigatória para liberar a matrícula — o acolhedor
          libera pelo contato &ldquo;Aceitou participar do discipulado&rdquo;. Aqui você escolhe se
          ela continua aparecendo para a sua congregação.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-gray-900">Situação</p>
          <Badge variant={enabled ? 'success' : 'muted'}>
            {enabled ? 'Visível' : 'Oculta'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {enabled
            ? 'O item “Boas Vindas” aparece no menu e os eventos podem ser criados e acompanhados normalmente.'
            : 'O item “Boas Vindas” não aparece no menu e a página fica inacessível. Os eventos e confirmações já registrados continuam guardados.'}
        </p>
        <Button
          onClick={handleToggle}
          loading={loading}
          variant={enabled ? 'outline' : 'primary'}
          className="self-start"
        >
          {enabled ? 'Ocultar Festa de Boas Vindas' : 'Mostrar Festa de Boas Vindas'}
        </Button>
      </div>
    </div>
  )
}
