import type { DatabaseAdapter } from './types';
import { SupabaseAdapter } from './supabaseAdapter';
import { D1Adapter } from './d1Adapter';
import { MemoryAdapter } from './memoryAdapter';

export * from './types';
export { SupabaseAdapter } from './supabaseAdapter';
export { D1Adapter } from './d1Adapter';
export { MemoryAdapter } from './memoryAdapter';

export interface ApiEnvBindings {
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  DB?: D1Database;
}

let cachedAdapter: { key: string; adapter: DatabaseAdapter } | null = null;

/**
 * 获取数据库适配器实例
 * 优先级：
 * 1. SUPABASE_URL + (SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY) -> SupabaseAdapter (PostgreSQL)
 * 2. env.DB -> D1Adapter (Cloudflare D1 SQLite)
 * 3. 兜底 -> MemoryAdapter (内存存储，用于单测或未配置环境)
 */
export function getDbAdapter(env?: ApiEnvBindings): DatabaseAdapter {
  const safeEnv = env ?? {};
  const supabaseUrl = safeEnv.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined);
  const supabaseKey =
    safeEnv.SUPABASE_KEY ||
    safeEnv.SUPABASE_SERVICE_ROLE_KEY ||
    safeEnv.SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined'
      ? process.env?.SUPABASE_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_ANON_KEY
      : undefined);

  if (supabaseUrl && supabaseKey) {
    const cacheKey = `supabase:${supabaseUrl}:${supabaseKey.slice(-6)}`;
    if (cachedAdapter && cachedAdapter.key === cacheKey) {
      return cachedAdapter.adapter;
    }
    const adapter = new SupabaseAdapter(supabaseUrl, supabaseKey);
    cachedAdapter = { key: cacheKey, adapter };
    return adapter;
  }

  if (safeEnv.DB) {
    return new D1Adapter(safeEnv.DB);
  }

  if (cachedAdapter && cachedAdapter.key === 'memory') {
    return cachedAdapter.adapter;
  }
  const adapter = new MemoryAdapter();
  cachedAdapter = { key: 'memory', adapter };
  return adapter;
}
