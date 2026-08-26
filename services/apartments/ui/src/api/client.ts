export type ApiError = {
  message: string
  status?: number
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw { message: text || res.statusText, status: res.status } as ApiError
  }
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init

  const res = await fetch(input, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw { message: msg || res.statusText, status: res.status } as ApiError
  }

  return parseJson<T>(res)
}

export type LoginRequest = {
  nickname: string
  password: string
  role: 'admin' | 'member' | 'visitor'
}

export type LoginResponse = {
  success: boolean
  token: string
  user: {
    nickname: string
    role: 'admin' | 'member' | 'visitor'
  }
}

export async function loginApi(body: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export type HealthResponse = {
  ok: boolean
  service: string
}

export async function healthApi(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health')
}
