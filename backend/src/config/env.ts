export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl: string;
  corsOrigin: string;
  sessionSecret: string;
}

export function loadAndValidateEnv(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);
  const host = process.env.HOST || '127.0.0.1';
  const databaseUrl = process.env.DATABASE_URL;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const sessionSecret = process.env.SESSION_SECRET;

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Configuration error: NODE_ENV must be development, test or production');
  }

  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Configuration error: PORT must be a valid port number (1-65535)');
  }

  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('Configuration error: DATABASE_URL environment variable is required');
  }

  if (!sessionSecret || sessionSecret.trim() === '') {
    throw new Error('Configuration error: SESSION_SECRET environment variable is required');
  }

  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
        url.pathname.length <= 1 || url.hash) throw new Error();
  } catch {
    // Never include the connection string or URL parser error (credentials).
    throw new Error('Configuration error: DATABASE_URL must be a PostgreSQL URL with host and database');
  }

  if (nodeEnv === 'production') {
    if (!process.env.CORS_ORIGIN) {
      throw new Error('Configuration error: CORS_ORIGIN must be explicit in production');
    }
    if (Buffer.byteLength(sessionSecret, 'utf8') < 32 ||
        /replace[-_ ]with|change[-_ ]?me|test[-_ ]session|development[-_ ]secret/i.test(sessionSecret) ||
        /^(.)\1+$/.test(sessionSecret)) {
      throw new Error('Configuration error: production SESSION_SECRET must be at least 32 bytes and not a placeholder');
    }
  }

  const trimmedCors = corsOrigin.trim();

  if (!trimmedCors) {
    throw new Error('Configuration error: CORS_ORIGIN environment variable cannot be empty');
  }

  if (trimmedCors === '*') {
    throw new Error('Configuration error: CORS_ORIGIN cannot be wildcard (*)');
  }

  try {
    const url = new URL(trimmedCors);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('CORS_ORIGIN must use http: or https: protocol');
    }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('CORS_ORIGIN must be a single origin without path, query, or hash');
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new Error('CORS_ORIGIN must use HTTPS in production');
    }
  } catch (err) {
    const msg =
      err instanceof Error && !err.message.startsWith('Invalid URL')
        ? err.message
        : 'CORS_ORIGIN must be a valid HTTP or HTTPS origin (e.g. http://localhost:5173)';
    throw new Error(`Configuration error: ${msg}`);
  }

  const normalizedCors =
    trimmedCors.endsWith('/') && trimmedCors.length > 8 ? trimmedCors.slice(0, -1) : trimmedCors;

  return {
    nodeEnv,
    port,
    host,
    databaseUrl,
    corsOrigin: normalizedCors,
    sessionSecret,
  };
}
