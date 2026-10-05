import type { Cartao } from './cartoes';
import type { TipoPergunta } from './spec';

/**
 * «~N min» de quem responde. É uma ESTIMATIVA de desenho (segundos típicos
 * por tipo de pergunta), não uma medição: serve para a pessoa decidir se
 * começa agora, e por isso arredonda para cima e nunca diz 0.
 */
const SEGUNDOS: Record<TipoPergunta | 'contacto', number> = {
  escolha_unica: 6,
  escolha_multipla: 10,
  avaliacao: 5,
  nps: 5,
  numero: 10,
  data: 10,
  texto_curto: 15,
  texto_longo: 45,
  seccao: 4,
  contacto: 30,
};

export function minutosRestantes(cartoes: readonly Cartao[], desde = 0): number {
  let segundos = 0;
  for (const c of cartoes.slice(Math.max(0, desde))) {
    segundos += SEGUNDOS[c.tipo === 'contacto' ? 'contacto' : c.pergunta.tipo];
  }
  return Math.max(1, Math.ceil(segundos / 60));
}
