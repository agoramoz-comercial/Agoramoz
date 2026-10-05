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

/**
 * Pedir dados pessoais como pergunta contorna o consentimento: vão para o
 * bloco Contacto. Três formas de pedir: com possessivo («Qual o seu email?»),
 * com imperativo («Indique o e-mail»), ou como rótulo curto de campo
 * («Nome e apelido», «Número de telemóvel»). Uma pergunta SOBRE o tema
 * («Como avalia o atendimento por telefone?») não é um pedido e fica.
 */
const DADO_PESSOAL =
  '(?:nome(?: completo| proprio)?|apelido|e-?mail|correio electronico|telefone|telemovel|celular|whatsapp|contacto(?: telefonico)?|morada|endereco|nif|nuit|data de nascimento|full name|name|surname|phone|address|date of birth)';
const PREFIXO_DADO = '(?:(?:numero|n|no|endereco) de )?';
const RE_POSSESSIVO = new RegExp(`\\b(?:seu|sua|vosso|vossa|teu|tua|your) ${PREFIXO_DADO}${DADO_PESSOAL}\\b`);
const RE_PEDIDO = new RegExp(
  `^(?:indique|insira|introduza|escreva|deixe|partilhe|informe|enter|provide|please enter) (?:aqui )?(?:o |a |os |as |um |uma |the )?${PREFIXO_DADO}${DADO_PESSOAL}\\b`,
);
const RE_CAMPO = new RegExp(`^(?:o |a )?${PREFIXO_DADO}${DADO_PESSOAL}\\b`);
/** «Nome da empresa», «Email da equipa»: dados da organização, não da pessoa. */
const RE_NAO_PESSOAL =
  /\b(?:empresa|organizacao|instituicao|entidade|equipa|projec?to|produto|marca|servico|departamento|website|site|company|organi[sz]ation|team|project|product|brand)\b/;

export function ehContacto(titulo: string): boolean {
  const s = simplificar(titulo)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (RE_NAO_PESSOAL.test(s)) return false;
  const palavras = s.split(' ').length;
  return RE_POSSESSIVO.test(s) || RE_PEDIDO.test(s) || (palavras <= 5 && RE_CAMPO.test(s));
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
    // «Concordo» por «Concordo totalmente» — mas só se for inequívoco, para um
    // «S» não se agarrar a «Sim» quando também há «Sem opinião».
    const comecam = alvo.opcoes.filter((o) => simplificar(o.rotulo).trim().startsWith(s));
    const comeca = s.length >= 2 && comecam.length === 1 ? comecam[0] : undefined;
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
  // Como no Microsoft Forms: perguntas e secções têm limites separados.
  const existentesComResposta = existentes.filter(temResposta).length;
  let espacoPerguntas = LIMITES.perguntas - existentesComResposta;
  let espacoSeccoes = LIMITES.seccoes - (existentes.length - existentesComResposta);

  const novas: Pergunta[] = [];
  /** Ordem da pergunta no rascunho (1, 2…, sem secções) → o seu índice em `novas`. */
  const porOrdem = new Map<number, number>();
  const condicoes: { indice: number; alvo: number; valor: string; op?: 'igual' | 'diferente' }[] =
    [];
  let ordem = 0;
  let foraDoLimite = 0;
  let contactosRetirados = 0;
  let saltosDeContacto = 0;
  /** Ordem da secção no rascunho (1, 2…) → o seu índice em `novas`. */
  const seccaoPorOrdem = new Map<number, number>();
  let ordemSeccao = 0;
  const saltosDeclarados: {
    origem: number;
    indice: number;
    salto: NonNullable<PerguntaImportada['saltos']>[number];
  }[] = [];

  for (const b of rascunho.blocos) {
    if (b.bloco === 'pergunta') ordem += 1;
    else ordemSeccao += 1;
    const semEspaco = b.bloco === 'seccao' ? espacoSeccoes <= 0 : espacoPerguntas <= 0;
    if (semEspaco) {
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
      if (b.condicao)
        condicoes.push({
          indice: novas.length,
          alvo: b.condicao.pergunta,
          valor: b.condicao.valor,
          op: b.condicao.op,
        });
      seccaoPorOrdem.set(ordemSeccao, novas.length);
      novas.push({
        tipo: 'seccao',
        chave,
        titulo: cortar(b.titulo, LIMITES.titulo)!,
        ...(ajuda ? { ajuda } : {}),
      });
      espacoSeccoes -= 1;
      continue;
    }
    if (ehContacto(b.titulo)) {
      contactosRetirados += 1;
      saltosDeContacto += b.saltos?.length ?? 0;
      continue;
    }
    const chave = novaChave(usadas, 'p');
    usadas.add(chave);
    porOrdem.set(ordem, novas.length);
    if (b.condicao)
      condicoes.push({
        indice: novas.length,
        alvo: b.condicao.pergunta,
        valor: b.condicao.valor,
        op: b.condicao.op,
      });
    for (const salto of b.saltos ?? [])
      saltosDeclarados.push({ origem: ordem, indice: novas.length, salto });
    novas.push(construirPergunta(b, chave, aviso));
    espacoPerguntas -= 1;
    if (b.razao) razoes[chave] = b.razao;
  }

  // Saltos («Se Não, passe para a Secção 3»), como no Microsoft Forms e no
  // Typeform: cada bloco saltado passa a «mostrar só se a resposta NÃO for…».
  // Uma secção inteira dentro do salto leva a condição ela própria — e com
  // ela as suas perguntas (logica.ts); uma secção cortada a meio leva-a
  // pergunta a pergunta. Um bloco que já tem condição não leva outra.
  const comCondicao = new Set(condicoes.map((c) => c.indice));
  for (const { origem, indice, salto } of saltosDeclarados) {
    const destino = salto.fim
      ? novas.length
      : salto.seccao !== undefined
        ? seccaoPorOrdem.get(salto.seccao)
        : porOrdem.get(salto.pergunta ?? 0);
    const descricao = `«se ${salto.valor} → ${
      salto.fim ? 'fim' : salto.seccao !== undefined ? `secção ${salto.seccao}` : `pergunta ${salto.pergunta}`
    }»`;
    if (destino === undefined || destino <= indice) {
      avisos.push({
        texto: `O salto ${descricao} não tem destino à frente da pergunta — retirado.`,
        pergunta: existentes.length + indice + 1,
      });
      continue;
    }
    let ocupados = 0;
    for (let j = indice + 1; j < destino; ) {
      if (novas[j]!.tipo === 'seccao') {
        let fimDaSeccao = j + 1;
        while (fimDaSeccao < novas.length && novas[fimDaSeccao]!.tipo !== 'seccao') fimDaSeccao += 1;
        if (fimDaSeccao <= destino && !comCondicao.has(j)) {
          condicoes.push({ indice: j, alvo: origem, valor: salto.valor, op: 'diferente' });
          comCondicao.add(j);
          j = fimDaSeccao;
          continue;
        }
        j += 1;
        continue;
      }
      if (comCondicao.has(j)) ocupados += 1;
      else {
        condicoes.push({ indice: j, alvo: origem, valor: salto.valor, op: 'diferente' });
        comCondicao.add(j);
      }
      j += 1;
    }
    if (ocupados > 0)
      avisos.push({
        texto: `O salto ${descricao} não chegou a ${ocupados} pergunta(s) que já tinham condição.`,
        pergunta: existentes.length + indice + 1,
      });
  }

  // Condições: só para perguntas ANTERIORES de um tipo que pode ser condição.
  let condicoesAplicadas = 0;
  for (const c of condicoes) {
    const indiceAlvo = porOrdem.get(c.alvo);
    const alvo = indiceAlvo !== undefined && indiceAlvo < c.indice ? novas[indiceAlvo] : undefined;
    const regras = alvo ? valoresDeCondicao(alvo) : null;
    const valor = alvo && regras ? valorDaCondicao(alvo, c.valor) : null;
    // «Diferente» (um salto) não pode cair para «inclui»: inverteria o sentido.
    const opValida = !c.op || c.op !== 'diferente' || (regras?.ops.includes('diferente') ?? false);
    if (!alvo || !regras || !valor || !opValida) {
      avisos.push({
        texto: `A condição «se ${c.valor}» não corresponde a uma opção de uma pergunta anterior — retirada.`,
        pergunta: existentes.length + c.indice + 1,
      });
      continue;
    }
    novas[c.indice] = {
      ...novas[c.indice]!,
      mostrarSe: {
        pergunta: alvo.chave,
        op: c.op && regras.ops.includes(c.op) ? c.op : regras.ops[0]!,
        valor,
      },
    } as Pergunta;
    condicoesAplicadas += 1;
  }

  if (foraDoLimite > 0)
    avisos.push({
      texto: `${foraDoLimite} bloco(s) não couberam: o máximo são ${LIMITES.perguntas} perguntas e ${LIMITES.seccoes} secções.`,
    });
  if (contactosRetirados > 0)
    avisos.push({
      texto: `${contactosRetirados} pergunta(s) de nome, email ou telefone foram retiradas: dados de contacto pedem-se no bloco «Contacto no fim», com consentimento.${saltosDeContacto > 0 ? ` Os ${saltosDeContacto} salto(s) que partiam delas também saíram.` : ''}`,
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
        ? 'O inquérito resultante é grande demais (máximo 256 KB). Divida-o em dois.'
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
