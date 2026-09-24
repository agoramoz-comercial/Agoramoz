/**
 * Log estruturado com lista de permissões.
 *
 * O que substitui: um `console.info('[lead]', { company, ... })` que despejava
 * o nome da empresa nos logs de runtime da plataforma. Empresa não é um dado
 * neutro — identifica o cliente e, num diagnóstico comercial, revela quem
 * está a avaliar o quê a quem tiver acesso aos logs.
 *
 * A defesa aqui é estrutural, não disciplinar: em vez de confiar em que
 * ninguém volte a escrever um campo sensível, só os campos declarados em
 * `SAFE_FIELDS` são serializados. Tudo o resto é descartado em silêncio, e o
 * próprio descarte fica contado em `dropped`, para que a omissão seja visível
 * em vez de passar despercebida.
 */

/**
 * Campos que podem ir para um log. Critério: não identificam pessoa nem
 * organização, e servem para diagnosticar. Acrescentar algo aqui é uma
 * decisão de privacidade, não de conveniência — daí a lista ser explícita.
 */
const SAFE_FIELDS = [
  'event',
  'correlationId',
  'outcome',
  'durationMs',
  'errorCode',
  'status',
  'country',
  'sector',
  'companySize',
  'decisionTimeframe',
  'decisionRole',
  'tier',
  'score',
  'duplicate',
  'reason',
  'limit',
  'windowMs',
  'bytes',
  'entityType',
  'entityId',
] as const;

type SafeField = (typeof SAFE_FIELDS)[number];
const SAFE = new Set<string>(SAFE_FIELDS);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Partial<Record<SafeField, unknown>> & Record<string, unknown>;

/**
 * Valores que sobrevivem à serialização. Um objeto aninhado passaria a lista
 * de permissões ao nível de cima e levaria consigo o que estivesse lá dentro,
 * por isso só escalares entram.
 */
function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return value as string | number | boolean;
  }
  return '[omitido: não escalar]';
}

function sanitize(fields: LogFields): { safe: Record<string, unknown>; dropped: number } {
  const safe: Record<string, unknown> = {};
  let dropped = 0;

  for (const [key, value] of Object.entries(fields)) {
    if (SAFE.has(key)) safe[key] = scalar(value);
    else dropped += 1;
  }

  return { safe, dropped };
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const { safe, dropped } = sanitize(fields);

  const line = {
    ts: new Date().toISOString(),
    level,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    service: 'web',
    event,
    ...safe,
    ...(dropped > 0 ? { droppedFields: dropped } : {}),
  };

  const serialized = JSON.stringify(line);

  // `console.error` para erros mantém a separação de streams que as
  // plataformas usam para alertar; o resto vai para stdout.
  if (level === 'error') console.error(serialized);
  else if (level === 'warn') console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (event: string, fields?: LogFields) => emit('debug', event, fields),
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
};

/** Exposto para o teste que prova que um campo não permitido não passa. */
export const __testing = { sanitize, SAFE_FIELDS };
