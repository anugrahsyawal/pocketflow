import type postgres from 'postgres';

// max_pipeline is supported by the pinned postgres.js runtime but absent from its types.
export type DatabaseOptions = postgres.Options<{}> & { max_pipeline?: number };

export function databaseOptions(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): DatabaseOptions {
  const mode = env.DB_CONNECTION_MODE ?? 'direct';
  if (!['direct', 'session', 'transaction'].includes(mode)) {
    throw new Error('Configuration error: DB_CONNECTION_MODE must be direct, session or transaction');
  }
  const tls = env.DB_SSL_MODE ?? (env.NODE_ENV === 'production' ? 'verify-full' : 'inherit');
  if (!['inherit', 'verify-full'].includes(tls) || (env.NODE_ENV === 'production' && tls !== 'verify-full')) {
    throw new Error('Configuration error: DB_SSL_MODE must be verify-full in production, or inherit for local development');
  }
  const options: DatabaseOptions = mode === 'transaction'
    ? { max: 1, prepare: false, max_pipeline: 1 }
    : { max: 10 };
  if (tls === 'verify-full') {
    let url: URL;
    try { url = new URL(databaseUrl); } catch {
      throw new Error('Configuration error: invalid DATABASE_URL');
    }
    for (const key of ['sslmode', 'ssl']) {
      if (url.searchParams.has(key) && url.searchParams.getAll(key).some(value => value !== 'verify-full')) {
        throw new Error('Configuration error: DATABASE_URL TLS options conflict with verify-full');
      }
    }
    // Do not silently ignore a libpq certificate path that this driver does not load.
    if (url.searchParams.has('sslrootcert')) {
      throw new Error('Configuration error: supply the trusted PEM using DB_SSL_CA, not URL sslrootcert');
    }
    const ca = env.DB_SSL_CA;
    if (ca !== undefined && (!ca.includes('-----BEGIN CERTIFICATE-----') || !ca.includes('-----END CERTIFICATE-----'))) {
      throw new Error('Configuration error: DB_SSL_CA must contain a PEM certificate');
    }
    options.ssl = { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
  } else if (env.DB_SSL_CA !== undefined) {
    throw new Error('Configuration error: DB_SSL_CA requires DB_SSL_MODE=verify-full');
  }
  return options;
}
