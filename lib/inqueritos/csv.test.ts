import { describe, expect, it } from 'vitest';
import { cabecalho, celula, colunas, legivel, linhaDeResposta } from './csv';
import { specInquerito } from './spec';

const SPEC = specInquerito.parse({
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: { titulo: 'Olá' },
  agradecimento: { titulo: 'Obrigado' },
  perguntas: [
    { tipo: 'seccao', chave: 's', titulo: 'Secção' },
    {
      tipo: 'escolha_multipla',
      chave: 'areas',
      titulo: 'Áreas',
      opcoes: [
        { chave: 'rh', rotulo: 'RH' },
        { chave: 'vendas', rotulo: 'Vendas; e marketing' },
      ],
    },
    { tipo: 'texto_curto', chave: 'nota', titulo: 'Nota' },
  ],
});

describe('células', () => {
  it('fórmulas ficam texto: =, +, -, @, tabulação e retorno', () => {
    for (const perigoso of ['=SUM(A1)', '+1', '-1+1', '@cmd', '\tx', '\rx']) {
      expect(celula(perigoso).replace(/^"/, '').startsWith("'")).toBe(true);
    }
    expect(celula('normal')).toBe('normal');
  });

  it('aspas, separador e quebras de linha são citados', () => {
    expect(celula('a;b')).toBe('"a;b"');
    expect(celula('diz "olá"')).toBe('"diz ""olá"""');
    expect(celula('linha\nnova')).toBe('"linha\nnova"');
  });
});

describe('linhas', () => {
  it('rótulos das opções, perguntas antigas no fim, sem secções', () => {
    const { antigas } = colunas(SPEC, ['areas', 'nota', 'retirada']);
    expect(antigas).toEqual(['retirada']);
    expect(cabecalho(SPEC, antigas, false)).toBe(
      'submetida_em;link;areas — Áreas;nota — Nota;retirada (versão anterior)\r\n',
    );
    const l = linhaDeResposta(
      SPEC,
      antigas,
      {
        submetidaEm: '2026-10-04T10:00:00Z',
        link: 'Clientes',
        respostas: { areas: ['rh', 'vendas'], nota: '=HYPERLINK("x")', retirada: 3 },
      },
      false,
    );
    expect(l).toBe(
      `2026-10-04T10:00:00Z;Clientes;"RH | Vendas; e marketing";"'=HYPERLINK(""x"")";3\r\n`,
    );
  });

  it('contacto só quando pedido', () => {
    expect(cabecalho(SPEC, [], true)).toContain('contacto_nome;contacto_email;contacto_telefone');
    const l = linhaDeResposta(
      SPEC,
      [],
      {
        submetidaEm: 't',
        link: null,
        respostas: {},
        contacto: { nome: 'Ana', email: 'a@b.co', telefone: null },
      },
      true,
    );
    expect(l).toBe('t;;;;Ana;a@b.co;\r\n');
    expect(legivel(undefined, undefined)).toBe('');
  });
});
