import { describe, expect, it } from 'vitest';
import { anonimizar } from './anonimo';

describe('anonimizar', () => {
  it.each([
    ['Chamo-me Ana Machel e fui despedida sem aviso.', 'Chamo-me [nome] e fui despedida sem aviso.', 1],
    ['O meu nome é João dos Santos, posso recorrer?', 'O meu nome é [nome], posso recorrer?', 1],
    ['O meu patrão Carlos Macamo não paga o salário.', 'O meu patrão [nome] não paga o salário.', 1],
    ['A minha vizinha, chamada Rosa Tembe, construiu no meu terreno.', 'A minha vizinha [nome], construiu no meu terreno.', 1],
    ['O Sr. Macamo e a Dra. Luísa Cossa assinaram o contrato.', 'O Sr. [nome] e a Dra. [nome] assinaram o contrato.', 2],
    ['o meu IRMÃO Pedro ficou com a casa', 'o meu IRMÃO [nome] ficou com a casa', 1],
    ['A Dona Maria da Conceição quer despejar-me.', 'A Dona [nome] quer despejar-me.', 1],
  ])('«%s»', (entrada, saida, n) => {
    expect(anonimizar(entrada)).toEqual({ texto: saida, retirados: n });
  });

  it.each([
    'Que aviso prévio tem de dar o empregador para rescindir o contrato?',
    'Como se pede o NUIT em Maputo?',
    'A Vodacom pode cortar o serviço sem avisar?',
    'O meu patrão despediu-me sem justa causa.',
    'Sou a dona da casa e o inquilino não paga.',
    'Sou o Director da empresa e quero despedir um trabalhador.',
    'O INSS paga pensão ao meu pai?',
    'A minha mãe faleceu em Nampula, quem herda?',
    'O senhorio pode aumentar a renda? Ele diz que sim.',
    'Trabalho na EDM desde 2019.',
  ])('não mexe em «%s»', (texto) => {
    expect(anonimizar(texto)).toEqual({ texto, retirados: 0 });
  });

  it('não devolve o nome em lado nenhum', () => {
    const r = anonimizar('Chamo-me Tomás Nhantumbo e o meu chefe Alberto Sitoe despediu a minha colega Graça.');
    expect(r.retirados).toBe(3);
    for (const nome of ['Tomás', 'Nhantumbo', 'Alberto', 'Sitoe', 'Graça']) expect(r.texto).not.toContain(nome);
  });
});
