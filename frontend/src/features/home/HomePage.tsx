import { useQuery } from '@tanstack/react-query'
import { getJson, type StatusResponse } from '../../lib/api.ts'

export function HomePage() {
  const status = useQuery({
    queryKey: ['status'],
    queryFn: () => getJson<StatusResponse>('/api/status'),
  })

  return (
    <section>
      <h1 className="text-2xl font-semibold">Paper trading on Oslo Børs</h1>
      <p className="mt-2 text-slate-600">Vestra is under construction.</p>
      <p className="mt-6 text-sm" role="status">
        {status.isPending && 'Checking backend…'}
        {status.isError && <span className="text-red-700">Backend unreachable</span>}
        {status.isSuccess && (
          <span className="text-emerald-700">
            Backend online · version {status.data.version}
          </span>
        )}
      </p>
    </section>
  )
}
