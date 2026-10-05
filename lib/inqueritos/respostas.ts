import { CAMPOS_CONTACTO, type CampoContacto, type Pergunta, type SpecInquerito } from './spec';
import { percursoDeVisibilidade, type ValorResposta } from './logica';

/**
 * Validação de uma resposta contra o inquérito publicado — no servidor, sempre.
 *
 * O que chega do browser é dado não confiável: o spec usado é o da base, não
 * um que venha com o pedido, e cada valor é conferido contra o tipo da sua
 * pergunta. Recusa-se (não se corrige em silêncio):
 *  - chaves que o inquérito não tem, ou respostas a secções;
 *  - respostas a perguntas que, pelas respostas anteriores, estavam escondidas;
 *  - obrigatórias visíveis em falta;
 *  - dados de contacto que o inquérito não pede, ou sem consentimento.
 *
 * Os textos ficam como vieram (só sem espaços nas pontas): uma resposta que
 * pareça uma instrução é guardada como texto, e nada a interpreta.
 */

export type CodigoErro =
  | 'forma'
  | 'desconhecida'
  | 'oculta'
  | 'obrigatoria'
  | 'invalida'
  | 'contacto_nao_permitido'
  | 'contacto_invalido'
  | 'consentimento';

export interface ErroResposta {
  readonly chave: string;
  readonly codigo: CodigoErro;
}

export type ContactoValidado = Partial<Record<CampoContacto, string>>;

export type ResultadoValidacao =
  | {
      readonly ok: true;
      readonly respostas: Readonly<Record<string, ValorResposta>>;
      /** Só quando a pessoa deixou algum dado E aceitou o consentimento. */
      readonly contacto: ContactoValidado | null;
    }
  | { readonly ok: false; readonly erros: readonly ErroResposta[] };

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONE = /^\+?[0-9 ()-]{6,20}$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

function vazio(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0)
  );
}

function dataValida(s: string): boolean {
  const m = DATA.exec(s);
  if (!m) return false;
  const [, a, me, d] = m.map(Number) as [number, number, number, number];
  if (a < 1900 || a > 2100) return false;
  const dt = new Date(Date.UTC(a, me - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === me - 1 && dt.getUTCDate() === d;
}

/**
 * O valor de UMA pergunta, validado e normalizado — ou `undefined` se não
 * serve. Exportado para o browser validar cada cartão com a mesma regra.
 */
export function validarValor(p: Pergunta, v: unknown): ValorResposta | undefined {
  switch (p.tipo) {
    case 'texto_curto':
    case 'texto_longo': {
      if (typeof v !== 'string') return undefined;
      const t = v.trim();
      return t.length >= 1 && t.length <= p.max ? t : undefined;
    }
    case 'escolha_unica':
      return typeof v === 'string' && p.opcoes.some((o) => o.chave === v) ? v : undefined;
    case 'escolha_multipla': {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return undefined;
      const escolhas = v as string[];
      if (new Set(escolhas).size !== escolhas.length) return undefined;
      if (!escolhas.every((x) => p.opcoes.some((o) => o.chave === x))) return undefined;
      if (escolhas.length < (p.min ?? 1)) return undefined;
      if (p.max !== undefined && escolhas.length > p.max) return undefined;
      // A ordem das opções do inquérito, não a dos cliques.
      return p.opcoes.map((o) => o.chave).filter((k) => escolhas.includes(k));
    }
    case 'avaliacao':
      return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5
        ? (v as number)
        : undefined;
    case 'nps':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10
        ? (v as number)
        : undefined;
    case 'numero': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      if (p.inteiro && !Number.isInteger(v)) return undefined;
      if (p.min !== undefined && v < p.min) return undefined;
      if (p.max !== undefined && v > p.max) return undefined;
      return v;
    }
    case 'data':
      return typeof v === 'string' && dataValida(v) ? v : undefined;
    case 'seccao':
      return undefined;
  }
}

function validarContacto(
  spec: SpecInquerito,
  entrada: unknown,
  erros: ErroResposta[],
): ContactoValidado | null {
  if (entrada === undefined || entrada === null) return null;
  if (typeof entrada !== 'object' || Array.isArray(entrada)) {
    erros.push({ chave: 'contacto', codigo: 'forma' });
    return null;
  }

  const bruto = entrada as Record<string, unknown>;
  const dados: ContactoValidado = {};
  for (const [k, v] of Object.entries(bruto)) {
    if (k === 'consentimento') continue;
    if (!(CAMPOS_CONTACTO as readonly string[]).includes(k)) {
      erros.push({ chave: `contacto.${k}`, codigo: 'desconhecida' });
      continue;
    }
    if (vazio(v)) continue;
    const campo = k as CampoContacto;
    if (!spec.contacto || !spec.contacto.campos.includes(campo)) {
      erros.push({ chave: `contacto.${campo}`, codigo: 'contacto_nao_permitido' });
      continue;
    }
    if (typeof v !== 'string') {
      erros.push({ chave: `contacto.${campo}`, codigo: 'contacto_invalido' });
      continue;
    }
    const t = v.trim();
    const valido =
      campo === 'email'
        ? t.length <= 254 && EMAIL.test(t)
        : campo === 'telefone'
          ? TELEFONE.test(t)
          : campo === 'nome'
            ? t.length <= 120
            : t.length <= 160;
    if (!valido) {
      erros.push({ chave: `contacto.${campo}`, codigo: 'contacto_invalido' });
      continue;
    }
    dados[campo] = campo === 'email' ? t.toLowerCase() : t;
  }

  if (Object.keys(dados).length === 0) return null;
  if (bruto.consentimento !== true) {
    erros.push({ chave: 'contacto.consentimento', codigo: 'consentimento' });
    return null;
  }
  return dados;
}

export function validarResposta(spec: SpecInquerito, entrada: unknown): ResultadoValidacao {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    return { ok: false, erros: [{ chave: '', codigo: 'forma' }] };
  }
  const { respostas: brutas, contacto, ...resto } = entrada as Record<string, unknown>;
  if (
    Object.keys(resto).length > 0 ||
    typeof brutas !== 'object' ||
    brutas === null ||
    Array.isArray(brutas)
  ) {
    return { ok: false, erros: [{ chave: '', codigo: 'forma' }] };
  }

  const erros: ErroResposta[] = [];
  const recebidas = brutas as Record<string, unknown>;
  const porChave = new Map(spec.perguntas.map((p) => [p.chave, p]));

  for (const k of Object.keys(recebidas)) {
    const p = porChave.get(k);
    if (!p || p.tipo === 'seccao') erros.push({ chave: k, codigo: 'desconhecida' });
  }

  // Pela ordem do inquérito, com a visibilidade calculada sobre os valores JÁ
  // VALIDADOS — um valor inválido nunca abre uma pergunta condicional.
  const validas: Record<string, ValorResposta> = {};
  const percurso = percursoDeVisibilidade();
  for (const p of spec.perguntas) {
    const visivel = percurso(p, validas);
    const bruto = recebidas[p.chave];

    if (!visivel) {
      if (!vazio(bruto) && p.tipo !== 'seccao') erros.push({ chave: p.chave, codigo: 'oculta' });
      continue;
    }
    if (p.tipo === 'seccao') continue;

    if (vazio(bruto)) {
      if (p.obrigatoria) erros.push({ chave: p.chave, codigo: 'obrigatoria' });
      continue;
    }
    const valor = validarValor(p, bruto);
    if (valor === undefined) erros.push({ chave: p.chave, codigo: 'invalida' });
    else validas[p.chave] = valor;
  }

  const dadosContacto = validarContacto(spec, contacto, erros);

  if (erros.length > 0) return { ok: false, erros };
  return { ok: true, respostas: validas, contacto: dadosContacto };
}
