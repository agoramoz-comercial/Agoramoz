/**
 * Limitador de taxa — interface e implementação em memória.
 *
 * Limitação que é preciso dizer em voz alta: **em memória, num runtime
 * serverless, isto NÃO é um limitador global**. Cada instância tem o seu mapa,
 * e a plataforma cria e destrói instâncias à vontade. Um atacante distribuído
 * contorna-o. O que este serviço faz bem é travar repetição acidental e abuso
 * ingénuo a partir de uma origem — que é a maior parte do ruído real — sem
 * acrescentar dependências antes de haver base de dados.
 *
 * A interface existe para que a troca por um adaptador persistente (Postgres
 * ou Redis) seja substituir a implementação, sem tocar em quem a chama. Até
 * lá, é melhor do que não ter nada e é honesto sobre o que é.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Pedidos ainda disponíveis na janela actual. */
  readonly remaining: number;
  /** Instante, em ms epoch, em que a janela se renova. */
  readonly resetAt: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface MemoryRateLimiterOptions {
  readonly max: number;
  readonly windowMs: number;
  /** Injetável para os testes não dependerem do relógio real. */
  readonly now?: () => number;
  /**
   * Tecto de chaves distintas. Sem isto, um atacante a rodar a origem faz o
   * mapa crescer sem limite até a instância ficar sem memória — o limitador
   * passava a ser ele próprio o vetor de negação de serviço.
   */
  readonly maxKeys?: number;
}

export function createMemoryRateLimiter(options: MemoryRateLimiterOptions): RateLimiter {
  const { max, windowMs, now = Date.now, maxKeys = 10_000 } = options;
  const buckets = new Map<string, Bucket>();

  function evictExpired(current: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) buckets.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const current = now();
      const existing = buckets.get(key);

      if (!existing || existing.resetAt <= current) {
        if (buckets.size >= maxKeys) {
          evictExpired(current);
          // Se ainda assim está cheio, são todas janelas vivas: recusar a
          // chave nova é preferível a crescer sem limite. Falha fechado.
          if (buckets.size >= maxKeys) {
            return { allowed: false, remaining: 0, resetAt: current + windowMs };
          }
        }
        buckets.set(key, { count: 1, resetAt: current + windowMs });
        return { allowed: true, remaining: max - 1, resetAt: current + windowMs };
      }

      if (existing.count >= max) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
      }

      existing.count += 1;
      return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt };
    },
  };
}

/**
 * Identidade do pedido para efeitos de limitação.
 *
 * Devolve um hash, nunca o IP em claro: a chave acaba em estruturas que podem
 * ser inspecionadas, e o IP é dado pessoal. O `x-forwarded-for` pode ser
 * forjado por quem fala diretamente com a aplicação — atrás da Vercel o
 * primeiro elemento é o do cliente, e é esse que se usa.
 */
export async function clientKey(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const real = request.headers.get('x-real-ip') ?? '';
  const source = forwarded.split(',')[0]?.trim() || real || 'desconhecido';

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
