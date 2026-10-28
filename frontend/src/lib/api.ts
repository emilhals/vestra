// Temporary hand-written types. Replaced by the OpenAPI-generated client in week 3.
export type StatusResponse = {
  name: string
  version: string
  serverTime: string
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
