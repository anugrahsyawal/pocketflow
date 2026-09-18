export interface ServerUser { id: string; email: string; displayName: string }

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

export function sessionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Terjadi kesalahan. Silakan coba lagi.';
  if (error.code === 'INVALID_CREDENTIALS') return 'Email atau password salah.';
  if (error.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
  if (error.status === 403) return 'Sesi keamanan berubah. Silakan coba lagi.';
  if (error.status === 0) return 'Backend belum dapat dijangkau. Pastikan server aktif, lalu coba lagi.';
  return 'Server belum dapat memproses permintaan. Silakan coba lagi.';
}

function parseUser(data: unknown): ServerUser {
  const user = (data as {user?: ServerUser} | null)?.user;
  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string') {
    throw new ApiError(502, 'INVALID_RESPONSE');
  }
  return user;
}

/** Session-only transport: no local persistence and no financial write API yet. */
export class SessionClient {
  private csrf: string | null = null;
  private refreshing: Promise<string> | null = null;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args), private readonly timeoutMs = 12000) {}

  clear(): void { this.csrf = null; }

  private async request(path: string, method = 'GET', body?: unknown, token?: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`/v1${path}`, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: {Accept: 'application/json', ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
          ...(token ? {'X-CSRF-Token': token} : {})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
      let data: unknown;
      try { data = await response.json(); } catch { throw new ApiError(response.ok ? 502 : response.status, 'INVALID_RESPONSE'); }
      if (!response.ok) {
        if (response.status === 401) this.clear();
        const code = (data as {error?: {code?: unknown}} | null)?.error?.code;
        throw new ApiError(response.status, typeof code === 'string' ? code : 'HTTP_ERROR');
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, 'NETWORK_ERROR');
    } finally { clearTimeout(timeout); }
  }

  async me(): Promise<ServerUser> { return parseUser(await this.request('/me')); }

  async login(email: string, password: string): Promise<ServerUser> {
    this.clear();
    const data = await this.request('/auth/login', 'POST', {email: email.trim(), password});
    const user = parseUser(data);
    this.csrf = this.parseToken(data);
    return user;
  }

  private parseToken(data: unknown): string {
    const token = (data as {csrfToken?: unknown} | null)?.csrfToken;
    if (typeof token !== 'string' || !token) throw new ApiError(502, 'INVALID_RESPONSE');
    return token;
  }

  private refreshToken(): Promise<string> {
    if (!this.refreshing) {
      this.refreshing = this.request('/auth/csrf').then(data => {
        this.csrf = this.parseToken(data);
        return this.csrf;
      }).finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async logout(): Promise<void> {
    // Only retry an explicit CSRF rejection, never an uncertain network result.
    try {
      const token = this.csrf ?? await this.refreshToken();
      try { await this.request('/auth/logout', 'POST', undefined, token); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 403 || error.code !== 'INVALID_CSRF_TOKEN') throw error;
        await this.request('/auth/logout', 'POST', undefined, await this.refreshToken());
      }
      this.clear();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { this.clear(); return; }
      throw error;
    }
  }
}
