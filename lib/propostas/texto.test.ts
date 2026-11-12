import { describe, expect, it } from 'vitest';
import { MILHAR, lerProposta, totais, verificar } from './modelo';
import { dataEm, duracaoEm, lerTexto, montanteEm, tipoDoTitulo } from './texto';

/**
 * Uma proposta como chega quando se copia de um documento: título, dados em
 * «Campo: valor», secções numeradas, listas, uma tabela do Word (tabulações)
 * e um total escrito à mão. TUDO DE EXEMPLO.
 */
const COLADO = `Proposta comercial — Portal de pedidos

Cliente: Cliente de Exemplo, Lda.
Para: Direcção Comercial
Assunto: Portal de pedidos para a rede de revendedores
Data: 12 de Novembro de 2026
Validade: 45 dias

1. Carta de apresentação
Exmos. Senhores,

Agradecemos a oportunidade de apresentar esta proposta.
Ela responde ao pedido de Outubro.

Com os melhores cumprimentos,
Equipa AGORAMOZ

2. Contexto
- Pedidos por telefone: hoje os revendedores fazem pedidos por telefone e WhatsApp.
- Sem histórico — ninguém sabe quanto cada revendedor comprou no trimestre.

3. Objectivos
- Reduzir o tempo de registo de um pedido.
- Dar à direcção uma visão diária das vendas.

4. Solução proposta
Portal web: pedidos, catálogo e estado da entrega.
Painel de direcção: vendas por revendedor e por produto.

5. Cronograma e investimento
Fase\tEntregáveis\tDuração\tValor
Diagnóstico\tLevantamento de processos\t2–3 semanas\t285 000 MZN
Desenho\tProtótipo navegável\t3 a 4 semanas\t450 000 MZN
Implementação\tPortal em produção\t2 meses\t1 000 000 MZN
Total\t\t\t1 800 000 MZN

Valores sem IVA.

6. Opções
- Opção A — Essencial: só o portal de pedidos. 735 000 MZN
- Opção B — Completa: portal e painel de direcção (recomendada). 1 735 000 MZN

7. Condições comerciais
- 40% na adjudicação, 60% na aceitação.

8. Riscos
- Atraso na entrega dos dados do catálogo. Mitigação: começar com os 50 produtos mais vendidos.

9. Próximos passos
1. Aprovar a opção B.
2. Marcar a reunião de arranque.

Contactos
geral@exemplo.test

Anexo técnico
Requisitos de alojamento a confirmar.`;

describe('peças do leitor', () => {
  it('reconhece valores com moeda e escala, e ignora números soltos', () => {
    expect(montanteEm('285 000 MZN')?.valor).toBe(285_000);
    expect(montanteEm('1.735.000,00 MT')?.valor).toBe(1_735_000);
    expect(montanteEm('1,2 milhões de meticais')).toMatchObject({ valor: 1_200_000, moeda: 'MZN' });
    expect(montanteEm('USD 12 500')).toMatchObject({ valor: 12_500, moeda: 'USD' });
    expect(montanteEm('em 2026, 3 semanas')).toBeNull();
  });

  it('lê durações e diz quando converte', () => {
    expect(duracaoEm('2–3 semanas')).toMatchObject({ min: 2, max: 3 });
    expect(duracaoEm('3 a 4 semanas')).toMatchObject({ min: 3, max: 4 });
    expect(duracaoEm('2 meses')).toMatchObject({ min: 8, max: 8 });
    expect(duracaoEm('2 meses')?.convertida).toMatch(/1 mês = 4 semanas/);
    expect(duracaoEm('10 dias úteis')).toMatchObject({ min: 2, max: 2 });
  });

  it('datas em três formatos, e recusa as impossíveis', () => {
    expect(dataEm('12 de Novembro de 2026')).toBe('2026-11-12');
    expect(dataEm('12 de Março de 2026')).toBe('2026-03-12');
    expect(dataEm('12/11/2026')).toBe('2026-11-12');
    expect(dataEm('2026-11-12')).toBe('2026-11-12');
    expect(dataEm('31/02/2026')).toBeNull();
  });

  it('títulos de secção: com numeração, Markdown, e não uma linha de fase', () => {
    expect(tipoDoTitulo('## 2. Contexto')).toBe('contexto');
    expect(tipoDoTitulo('Cronograma e investimento')).toBe('fases');
    expect(tipoDoTitulo('Condições comerciais:')).toBe('condicoes');
    expect(tipoDoTitulo('Diagnóstico 2 a 3 semanas 285 000 MZN')).toBeNull();
    expect(tipoDoTitulo('Anexo técnico')).toBeNull();
  });
});

describe('lerTexto: a proposta colada', () => {
  const { proposta: p, relatorio: r } = lerTexto(COLADO, '2026-01-01');

  it('produz uma proposta válida para o modelo', () => {
    expect(lerProposta(JSON.parse(JSON.stringify(p)))).not.toBeNull();
  });

  it('capa: título, cliente, destinatário, assunto, data e validade', () => {
    expect(p.titulo).toBe('Portal de pedidos');
    expect(p.projeto).toBe('Portal de pedidos');
    expect(p.cliente).toBe('Cliente de Exemplo, Lda.');
    expect(p.destinatario).toBe('Direcção Comercial');
    expect(p.data).toBe('2026-11-12');
    expect(p.validadeDias).toBe(45);
  });

  it('carta sem o fecho (o modelo tem o seu), e diz que o trocou', () => {
    expect(p.carta).toContain('Agradecemos a oportunidade');
    expect(p.carta).toContain('Ela responde ao pedido de Outubro.');
    expect(p.carta).not.toMatch(/cumprimentos|Equipa AGORAMOZ/);
    expect(r.avisos.some((a) => /fecho e a assinatura/.test(a))).toBe(true);
  });

  it('contexto e solução com título e texto; objectivos, condições e passos como lista', () => {
    expect(p.contexto).toEqual([
      { titulo: 'Pedidos por telefone', texto: 'hoje os revendedores fazem pedidos por telefone e WhatsApp.' },
      { titulo: 'Sem histórico', texto: 'ninguém sabe quanto cada revendedor comprou no trimestre.' },
    ]);
    expect(p.solucao.map((s) => s.titulo)).toEqual(['Portal web', 'Painel de direcção']);
    expect(p.objectivos).toHaveLength(2);
    expect(p.passos).toEqual(['Aprovar a opção B.', 'Marcar a reunião de arranque.']);
  });

  it('fases da tabela, com meses convertidos e a frase solta como condição', () => {
    expect(p.fases.map((f) => [f.nome, f.semanasMin, f.semanasMax, f.valor])).toEqual([
      ['Diagnóstico', 2, 3, 285_000],
      ['Desenho', 3, 4, 450_000],
      ['Implementação', 8, 8, 1_000_000],
    ]);
    expect(p.fases.every((f) => f.custo === null)).toBe(true); // o custo nunca vem do texto do cliente
    expect(p.condicoes).toEqual(['Valores sem IVA.', '40% na adjudicação, 60% na aceitação.']);
    expect(r.avisos.some((a) => /1 mês = 4 semanas/.test(a))).toBe(true);
  });

  it('o total escrito (1 800 000) não bate com a soma (1 735 000): diz, e usa a soma', () => {
    expect(totais(p).total).toBe(1_735_000);
    const aviso = r.avisos.find((a) => /soma das fases/.test(a));
    expect(aviso).toContain(`1${MILHAR}800${MILHAR}000`);
    expect(aviso).toContain(`1${MILHAR}735${MILHAR}000`);
  });

  it('opções sem o prefixo, com valor e a recomendada marcada', () => {
    expect(p.opcoes).toEqual([
      { nome: 'Essencial', descricao: 'só o portal de pedidos.', valor: 735_000, recomendada: false },
      { nome: 'Completa', descricao: 'portal e painel de direcção.', valor: 1_735_000, recomendada: true },
    ]);
  });

  it('risco e mitigação separados', () => {
    expect(p.riscos).toEqual([
      { risco: 'Atraso na entrega dos dados do catálogo', mitigacao: 'começar com os 50 produtos mais vendidos.' },
    ]);
  });

  it('o que não tem lugar fica listado, e os contactos são sempre os da AGORAMOZ', () => {
    expect(r.naoReconhecido).toEqual([{ titulo: 'Anexo técnico', texto: 'Requisitos de alojamento a confirmar.' }]);
    expect(JSON.stringify(p)).not.toContain('geral@exemplo.test');
    expect(r.avisos.some((a) => /comercial@agoramoz.com/.test(a))).toBe(true);
  });

  it('nenhuma palavra inventada: cada texto das folhas está no texto colado', () => {
    const fonte = COLADO.replace(/\s+/g, ' ');
    const textos = [
      p.titulo,
      p.cliente,
      ...p.contexto.flatMap((l) => [l.titulo, l.texto]),
      ...p.solucao.flatMap((l) => [l.titulo, l.texto]),
      ...p.objectivos,
      ...p.condicoes,
      ...p.passos,
      ...p.fases.flatMap((f) => [f.nome, f.entregaveis]),
      ...p.opcoes.flatMap((o) => [o.nome, o.descricao.replace(/\.$/, '')]),
      ...p.riscos.flatMap((x) => [x.risco, x.mitigacao]),
    ].filter(Boolean);
    for (const t of textos) expect(fonte, t).toContain(t);
  });

  it('o resultado passa as verificações (falta só a margem, que o texto do cliente nunca traz)', () => {
    const bloqueios = verificar(p).filter((a) => a.nivel === 'bloqueia');
    expect(bloqueios).toEqual([]);
  });
});

describe('lerTexto: casos difíceis', () => {
  it('Markdown com # e tabela com |, sem dados de capa', () => {
    const { proposta: p } = lerTexto(
      [
        '# Proposta: Dashboard de vendas',
        '',
        '## Investimento',
        '| Fase | Semanas | Valor |',
        '|---|---|---|',
        '| Dados | 2 | USD 4 000 |',
        '| Painel | 3 | USD 6 000 |',
      ].join('\n'),
      '2026-11-12',
    );
    expect(p.titulo).toBe('Dashboard de vendas');
    expect(p.moeda).toBe('USD');
    expect(p.fases.map((f) => [f.nome, f.semanasMin, f.valor])).toEqual([
      ['Dados', 2, 4_000],
      ['Painel', 3, 6_000],
    ]);
  });

  it('a mesma fase no cronograma e no investimento junta-se pelo nome', () => {
    const { proposta: p } = lerTexto(
      [
        'Cronograma',
        '- Diagnóstico: 2 semanas',
        '- Desenho: 3 semanas',
        '',
        'Investimento',
        '- Diagnóstico: 100 000 MZN',
        '- Desenho: 200 000 MZN',
      ].join('\n'),
      '2026-11-12',
    );
    expect(p.fases.map((f) => [f.nome, f.semanasMin, f.valor])).toEqual([
      ['Diagnóstico', 2, 100_000],
      ['Desenho', 3, 200_000],
    ]);
  });

  it('acima do limite de uma secção, o excesso fica listado e não se perde', () => {
    const itens = Array.from({ length: 9 }, (_, i) => `- Objectivo ${i + 1} com texto.`);
    const { proposta: p, relatorio: r } = lerTexto(['Objectivos', ...itens].join('\n'), '2026-11-12');
    expect(p.objectivos).toHaveLength(6);
    expect(r.naoReconhecido).toHaveLength(3);
  });

  it('texto longo de mais é cortado numa palavra, e o corte é dito', () => {
    const longo = `Ponto: ${'palavra '.repeat(80)}`;
    const { proposta: p, relatorio: r } = lerTexto(['Contexto', longo].join('\n'), '2026-11-12');
    expect(p.contexto[0]!.texto.length).toBeLessThanOrEqual(400);
    expect(p.contexto[0]!.texto.endsWith('…')).toBe(true);
    expect(r.avisos.some((a) => /cortado/.test(a))).toBe(true);
  });

  it('texto sem secções vira carta', () => {
    const { proposta: p } = lerTexto('Caro cliente,\n\nSegue a nossa proposta para o projecto.', '2026-11-12');
    expect(p.carta).toContain('Segue a nossa proposta');
  });
});
