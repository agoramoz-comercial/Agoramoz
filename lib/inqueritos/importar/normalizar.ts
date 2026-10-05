import { novaChave, type Reservadas } from '../construtor';
import {
  LIMITES,
  specInquerito,
  temResposta,
  valoresDeCondicao,
  type Pergunta,
  type SpecInquerito,
  type TipoPergunta,
} from '../spec';
import { simplificar } from './local';
import type { PerguntaImportada, RascunhoImportado } from './esquema';

/**
 * Do rascunho (venha do analisador local ou do Kimi) a um `SpecInquerito`
 * válido — ou a uma recusa com motivo. Nunca sai daqui um inquérito que não
 * passe a validação completa (`specInquerito`), e cada correcção feita pelo
 * caminho fica escrita num aviso, para o admin ver o que mudou e porquê.
 *
 * As chaves são geradas aqui (`p1`, `o1`…), nunca vindas do texto, e evitam
 * as já gravadas em versões anteriores (`reservadas`): uma chave com
 * respostas nunca é dada a outra pergunta.
 */

export type ModoImportacao = 'substituir' | 'acrescentar';

export interface Aviso {
  readonly texto: string;
  /** Posição (1, 2…) da pergunta no resultado, quando o aviso é sobre uma. */
  readonly pergunta?: number;
}

export interface Resumo {
  readonly seccoes: number;
  readonly perguntas: number;
  readonly obrigatorias: number;
  readonly condicoes: number;
  readonly porTipo: Partial<Record<TipoPergunta, number>>;
}

export type ResultadoImportacao =
  | {
      readonly ok: true;
      readonly spec: SpecInquerito;
      readonly avisos: readonly Aviso[];
      readonly resumo: Resumo;
      /** Chave da pergunta → porque é que o tipo foi escolhido. */
      readonly razoes: Readonly<Record<string, string>>;
    }
  | { readonly ok: false; readonly motivo: string };

const cortar = (s: string | undefined, max: number) =>
  s === undefined ? undefined : s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

/** Pedir nome, email ou telefone como pergunta contorna o consentimento: vai para o bloco Contacto. */
const RE_CONTACTO =
  /^(?:o seu |a sua |seu |sua |your )?(?:nome(?: completo)?|e-?mail|endereco de e-?mail|telefone|telemovel|celular|whatsapp|contacto|numero de telefone|full name|name|phone(?: number)?|email address)\s*[?:.]?$/;

function ehContacto(titulo: string): boolean {
  return RE_CONTACTO.test(simplificar(titulo).trim());
}

function construirPergunta(
  q: PerguntaImportada,
  chave: string,
  aviso: (texto: string) => void,
): Pergunta {
  const titulo = cortar(q.titulo, LIMITES.titulo)!;
  const ajuda = cortar(q.ajuda, LIMITES.ajuda);
  if (q.titulo.length > LIMITES.titulo) aviso(`Título cortado a ${LIMITES.titulo} caracteres.`);
  if (q.ajuda && q.ajuda.length > LIMITES.ajuda)
    aviso(`Subtítulo cortado a ${LIMITES.ajuda} caracteres.`);
  const comum = { chave, titulo, ...(ajuda ? { ajuda } : {}), obrigatoria: q.obrigatoria ?? false };

  // Opções: sem vazias, sem repetidas (ignora maiúsculas e acentos), no máximo 20.
  const vistas = new Set<string>();
  let rotulos = (q.opcoes ?? [])
    .map((o) => cortar(o.trim(), LIMITES.rotuloOpcao)!)
    .filter((o) => {
      const s = simplificar(o);
      if (!o || vistas.has(s)) return false;
      vistas.add(s);
      return true;
    });
  if (rotulos.length > LIMITES.opcoes) {
    aviso(`Ficaram as primeiras ${LIMITES.opcoes} opções (o máximo).`);
    rotulos = rotulos.slice(0, LIMITES.opcoes);
  }

  let tipo = q.tipo ?? (rotulos.length >= 2 ? 'escolha_unica' : 'texto_curto');
  if ((tipo === 'escolha_unica' || tipo === 'escolha_multipla') && rotulos.length < 2) {
    aviso('Escolha sem pelo menos duas opções — passou a texto curto.');
    tipo = 'texto_curto';
  }

  switch (tipo) {
    case 'escolha_unica':
    case 'escolha_multipla': {
      const opcoes = rotulos.map((rotulo, i) => ({ chave: `o${i + 1}`, rotulo }));
      if (tipo === 'escolha_unica') return { tipo, ...comum, opcoes };
      const n = opcoes.length;
      let min = q.min !== undefined && q.min >= 1 && q.min <= n ? q.min : undefined;
      let max = q.max !== undefined && q.max >= 1 && q.max <= n ? q.max : undefined;
      if (min !== undefined && max !== undefined && min > max) {
        aviso('Mínimo maior do que o máximo de escolhas — retirados.');
        min = undefined;
        max = undefined;
      }
      return {
        tipo,
        ...comum,
        opcoes,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
    }
    case 'numero': {
      const valido = q.min === undefined || q.max === undefined || q.min <= q.max;
      if (!valido) aviso('Intervalo do número inválido — retirado.');
      return {
        tipo,
        ...comum,
        inteiro: q.inteiro ?? false,
        ...(valido && q.min !== undefined ? { min: q.min } : {}),
        ...(valido && q.max !== undefined ? { max: q.max } : {}),
      };
    }
    case 'texto_curto':
      return { tipo, ...comum, max: LIMITES.textoCurto };
    case 'texto_longo':
      return { tipo, ...comum, max: LIMITES.textoLongo };
    case 'avaliacao':
    case 'nps':
    case 'data':
      return { tipo, ...comum };
  }
}

/** O valor de condição (`mostrarSe.valor`) a partir do que o texto disse. */
function valorDaCondicao(alvo: Pergunta, dito: string): string | null {
  const s = simplificar(dito).trim();
  if (alvo.tipo === 'escolha_unica' || alvo.tipo === 'escolha_multipla') {
    const igual = alvo.opcoes.find((o) => simplificar(o.rotulo).trim() === s);
    const comeca = alvo.opcoes.find((o) => simplificar(o.rotulo).trim().startsWith(s));
    return (igual ?? comeca)?.chave ?? null;
  }
  const permitidos = valoresDeCondicao(alvo)?.valores ?? [];
  return permitidos.includes(s) ? s : null;
}

export function normalizar(
  rascunho: RascunhoImportado,
  opcoes: { base: SpecInquerito; reservadas: Reservadas; modo: ModoImportacao },
): ResultadoImportacao {
  const { base, reservadas, modo } = opcoes;
  const avisos: Aviso[] = [];
  const razoes: Record<string, string> = {};
  const existentes = modo === 'acrescentar' ? base.perguntas : [];
  const usadas = new Set<string>([...reservadas.perguntas, ...existentes.map((p) => p.chave)]);
  const espaco = LIMITES.perguntas - existentes.length;

  const novas: Pergunta[] = [];
  /** Ordem da pergunta no rascunho (1, 2…, sem secções) → o seu índice em `novas`. */
  const porOrdem = new Map<number, number>();
  const condicoes: { indice: number; alvo: number; valor: string }[] = [];
  let ordem = 0;
  let foraDoLimite = 0;
  let contactosRetirados = 0;

  for (const b of rascunho.blocos) {
    if (b.bloco === 'pergunta') ordem += 1;
    if (novas.length >= espaco) {
      foraDoLimite += 1;
      continue;
    }
    const posicao = existentes.length + novas.length + 1;
    const aviso = (texto: string) => avisos.push({ texto, pergunta: posicao });

    if (b.bloco === 'seccao') {
      const chave = novaChave(usadas, 'p');
      usadas.add(chave);
      const ajuda = cortar(b.texto, LIMITES.ajuda);
      if (b.texto && b.texto.length > LIMITES.ajuda)
        aviso(`Texto da secção cortado a ${LIMITES.ajuda} caracteres.`);
      novas.push({
        tipo: 'seccao',
        chave,
        titulo: cortar(b.titulo, LIMITES.titulo)!,
        ...(ajuda ? { ajuda } : {}),
      });
      continue;
    }
    if (ehContacto(b.titulo)) {
      contactosRetirados += 1;
      continue;
    }
    const chave = novaChave(usadas, 'p');
    usadas.add(chave);
    porOrdem.set(ordem, novas.length);
    if (b.condicao) condicoes.push({ indice: novas.length, alvo: b.condicao.pergunta, valor: b.condicao.valor });
    novas.push(construirPergunta(b, chave, aviso));
    if (b.razao) razoes[chave] = b.razao;
  }

  // Condições: só para perguntas ANTERIORES de um tipo que pode ser condição.
  let condicoesAplicadas = 0;
  for (const c of condicoes) {
    const indiceAlvo = porOrdem.get(c.alvo);
    const alvo = indiceAlvo !== undefined && indiceAlvo < c.indice ? novas[indiceAlvo] : undefined;
    const regras = alvo ? valoresDeCondicao(alvo) : null;
    const valor = alvo && regras ? valorDaCondicao(alvo, c.valor) : null;
    if (!alvo || !regras || !valor) {
      avisos.push({
        texto: `A condição «se ${c.valor}» não corresponde a uma opção de uma pergunta anterior — retirada.`,
        pergunta: existentes.length + c.indice + 1,
      });
      continue;
    }
    novas[c.indice] = {
      ...novas[c.indice]!,
      mostrarSe: { pergunta: alvo.chave, op: regras.ops[0]!, valor },
    } as Pergunta;
    condicoesAplicadas += 1;
  }

  if (foraDoLimite > 0)
    avisos.push({
      texto: `${foraDoLimite} bloco(s) não couberam: o máximo são ${LIMITES.perguntas} perguntas e secções.`,
    });
  if (contactosRetirados > 0)
    avisos.push({
      texto: `${contactosRetirados} pergunta(s) de nome, email ou telefone foram retiradas: dados de contacto pedem-se no bloco «Contacto no fim», com consentimento.`,
    });

  if (!novas.some(temResposta))
    return {
      ok: false,
      motivo: 'Não encontrei perguntas no texto. Numere-as («1.», «2.») ou acabe-as com «?».',
    };

  const titulo = cortar(rascunho.titulo, LIMITES.ecraTitulo);
  const corpo = cortar(rascunho.introducao, LIMITES.ecraCorpo);
  const obrigado = cortar(rascunho.agradecimento, LIMITES.ecraTitulo);
  const candidato: SpecInquerito = {
    ...base,
    boasVindas:
      modo === 'substituir' && titulo ? { titulo, ...(corpo ? { corpo } : {}) } : base.boasVindas,
    agradecimento: modo === 'substituir' && obrigado ? { titulo: obrigado } : base.agradecimento,
    perguntas: [...existentes, ...novas],
  };

  const r = specInquerito.safeParse(candidato);
  if (!r.success) {
    const tamanho = r.error.issues.some((i) => /64|bytes|tamanho/i.test(i.message));
    return {
      ok: false,
      motivo: tamanho
        ? 'O inquérito resultante é grande demais (máximo 64 KB). Divida-o em dois.'
        : 'O texto não deu um inquérito válido. Reveja a estrutura e tente de novo.',
    };
  }

  const porTipo: Partial<Record<TipoPergunta, number>> = {};
  for (const p of novas) porTipo[p.tipo] = (porTipo[p.tipo] ?? 0) + 1;
  return {
    ok: true,
    spec: r.data,
    avisos,
    razoes,
    resumo: {
      seccoes: porTipo.seccao ?? 0,
      perguntas: novas.filter(temResposta).length,
      obrigatorias: novas.filter((p) => temResposta(p) && p.obrigatoria).length,
      condicoes: condicoesAplicadas,
      porTipo,
    },
  };
}
