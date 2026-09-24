import { describe, expect, it } from 'vitest';
import type { LeadInput } from '@/lib/forms/lead-schema';
import { runRules } from './rules';
import { SCORING_VERSION } from './score';
import { validateDraft, type Draft } from './validate-draft';

function lead(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    country: 'mz',
    sector: 'energia-mineracao',
    company: 'Empresa Exemplo',
    companySize: '10-49',
    currentWebsite: '',
    processToImprove: ['comercial'],
    problemImpact: 'x'.repeat(200),
    decisionTimeframe: '1-3-meses',
    investmentBand: 'mz-2',
    decisionRole: 'decisor',
    name: 'Nome Exemplo',
    workEmail: 'nome@exemplo.co.mz',
    phone: '+258840000000',
    consent: true,
    ...overrides,
  };
}

const pacote = runRules(lead(), SCORING_VERSION);

/** Redação mínima e honesta: cita um achado real e evidência real, sem números. */
function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    resumo: 'A empresa não declarou presença web no formulário.',
    secoes: [
      {
        findingCode: 'SEM_PRESENCA_WEB',
        titulo: 'Sem presença web declarada',
        corpo: 'Não foi indicado nenhum endereço de website na resposta ao diagnóstico.',
        evidenceIds: ['resp.hasWebsite'],
      },
    ],
    proximosPassos: ['Marcar uma conversa de levantamento.'],
    ...overrides,
  };
}

describe('caso válido', () => {
  it('aceita uma redação ancorada em evidência e sem números inventados', () => {
    const r = validateDraft(draft(), pacote);
    expect(r.ok).toBe(true);
  });
});

describe('forma da saída', () => {
  it.each([
    ['sem resumo', { resumo: '' }],
    ['sem secções', { secoes: [] }],
    ['sem próximos passos', { proximosPassos: [] }],
  ])('rejeita %s', (_rotulo, override) => {
    const r = validateDraft(draft(override as Partial<Draft>), pacote);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === 'SCHEMA')).toBe(true);
  });

  it('rejeita o que nem sequer é um objeto', () => {
    expect(validateDraft('uma string qualquer', pacote).ok).toBe(false);
  });
});

describe('ancoragem em evidência', () => {
  /** Citar evidência inexistente é invenção com aparência de rigor. */
  it('rejeita um id de evidência que não existe', () => {
    const r = validateDraft(
      draft({
        secoes: [{ ...draft().secoes[0]!, evidenceIds: ['resp.inventado'] }],
      }),
      pacote,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === 'EVIDENCIA_INEXISTENTE')).toBe(true);
  });

  it('rejeita uma secção que não corresponde a nenhum achado', () => {
    const r = validateDraft(
      draft({ secoes: [{ ...draft().secoes[0]!, findingCode: 'ACHADO_QUE_NAO_EXISTE' }] }),
      pacote,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === 'ACHADO_INEXISTENTE')).toBe(true);
  });
});

describe('numerais inventados', () => {
  /**
   * O teste que define a garantia inteira: o MESMO texto, com e sem o número.
   * Se só o número os separa, então é o número que está a ser verificado — e
   * não o estilo, o comprimento ou a sorte.
   */
  it('rejeita um número que não vem de lado nenhum, e aceita o texto sem ele', () => {
    const comNumero = draft({
      resumo: 'Empresas sem presença web perdem 37 oportunidades por mês.',
    });
    const semNumero = draft({
      resumo: 'Empresas sem presença web perdem oportunidades.',
    });

    const mau = validateDraft(comNumero, pacote);
    expect(mau.ok).toBe(false);
    if (!mau.ok) expect(mau.issues.some((i) => i.code === 'NUMERO_INVENTADO')).toBe(true);

    expect(validateDraft(semNumero, pacote).ok).toBe(true);
  });

  it('aceita um número que consta da evidência', () => {
    // A dimensão declarada é 10-49; ambos os limites são citáveis.
    const r = validateDraft(draft({ resumo: 'A organização tem entre 10 e 49 pessoas.' }), pacote);
    expect(r.ok).toBe(true);
  });

  it('verifica também os títulos, o corpo e os próximos passos', () => {
    for (const campo of ['titulo', 'corpo'] as const) {
      const secao = { ...draft().secoes[0]!, [campo]: 'Impacto estimado de 88 unidades.' };
      const r = validateDraft(draft({ secoes: [secao] }), pacote);
      expect(r.ok).toBe(false);
    }

    const r = validateDraft(draft({ proximosPassos: ['Recuperar 91 contactos.'] }), pacote);
    expect(r.ok).toBe(false);
  });
});

describe('percentagens, moeda e datas', () => {
  it.each([
    ['percentagem', 'Aumento de 34% nas oportunidades.', 'PERCENTAGEM_INVENTADA'],
    ['percentagem por extenso', 'Aumento de 34 por cento.', 'PERCENTAGEM_INVENTADA'],
    ['moeda', 'Retorno de 1 250 000 MZN no primeiro ano.', 'MOEDA_INVENTADA'],
    ['ano', 'Desde 2019 que o setor mudou.', 'DATA_INVENTADA'],
  ])('rejeita %s inventada', (_rotulo, texto, codigo) => {
    const r = validateDraft(draft({ resumo: texto }), pacote);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === codigo)).toBe(true);
  });

  it('aceita um valor monetário que vem da faixa que o cliente escolheu', () => {
    // mz-2 é «250 000 – 750 000 MZN»; ambos os extremos são citáveis.
    const r = validateDraft(
      draft({ resumo: 'A faixa indicada começa em 250 000 MZN.' }),
      pacote,
    );
    expect(r.ok).toBe(true);
  });
});

describe('termos proibidos', () => {
  it.each([
    ['garantia de resultado', 'Garantimos o retorno do investimento.'],
    ['garantia de resultado com acento', 'O resultado é garantido.'],
    ['escassez fabricada', 'Últimas vagas para este trimestre.'],
    ['urgência fabricada', 'Não perca esta oportunidade.'],
    ['liderança de mercado', 'Somos líder de mercado em Moçambique.'],
    ['superlativo', 'A melhor solução para o seu setor.'],
  ])('rejeita %s', (_rotulo, texto) => {
    const r = validateDraft(draft({ resumo: texto }), pacote);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === 'TERMO_PROIBIDO')).toBe(true);
  });

  it('apanha independentemente de acentos e de maiúsculas', () => {
    const r = validateDraft(draft({ resumo: 'GARANTIMOS resultados.' }), pacote);
    expect(r.ok).toBe(false);
  });

  it('não rejeita linguagem legítima parecida', () => {
    const r = validateDraft(
      draft({ resumo: 'Não prometemos resultados; propomos um levantamento.' }),
      pacote,
    );
    expect(r.ok).toBe(true);
  });
});

describe('avisos obrigatórios', () => {
  const comContextoFraco = runRules(lead({ problemImpact: 'x'.repeat(30) }), SCORING_VERSION);

  it('exige o aviso quando o achado o determina', () => {
    const r = validateDraft(
      draft({
        secoes: [
          {
            findingCode: 'CONTEXTO_INSUFICIENTE',
            titulo: 'Contexto a aprofundar',
            corpo: 'A descrição fornecida é breve.',
            evidenceIds: ['der.impactLength'],
          },
        ],
      }),
      comContextoFraco,
      { requireDisclaimerFor: { CONTEXTO_INSUFICIENTE: /carece de levantamento/i } },
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === 'DISCLAIMER_EM_FALTA')).toBe(true);
  });

  it('aceita quando o aviso está presente', () => {
    const r = validateDraft(
      draft({
        resumo: 'Esta leitura carece de levantamento antes de qualquer proposta.',
        secoes: [
          {
            findingCode: 'CONTEXTO_INSUFICIENTE',
            titulo: 'Contexto a aprofundar',
            corpo: 'A descrição fornecida é breve.',
            evidenceIds: ['der.impactLength'],
          },
        ],
      }),
      comContextoFraco,
      { requireDisclaimerFor: { CONTEXTO_INSUFICIENTE: /carece de levantamento/i } },
    );

    expect(r.ok).toBe(true);
  });
});

describe('relatório de problemas', () => {
  it('acumula todos os problemas em vez de parar no primeiro', () => {
    const r = validateDraft(
      draft({
        resumo: 'Garantimos 45% de retorno.',
        secoes: [{ ...draft().secoes[0]!, evidenceIds: ['resp.inexistente'] }],
      }),
      pacote,
    );

    expect(r.ok).toBe(false);
    if (!r.ok) {
      const codigos = new Set(r.issues.map((i) => i.code));
      expect(codigos.has('TERMO_PROIBIDO')).toBe(true);
      expect(codigos.has('PERCENTAGEM_INVENTADA')).toBe(true);
      expect(codigos.has('EVIDENCIA_INEXISTENTE')).toBe(true);
    }
  });

  it('não repete o mesmo problema no mesmo sítio', () => {
    const r = validateDraft(draft({ resumo: 'Foram 77 e outra vez 77 ocorrências.' }), pacote);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const iguais = r.issues.filter((i) => i.code === 'NUMERO_INVENTADO' && i.path === 'resumo');
      expect(iguais).toHaveLength(1);
    }
  });

  it('indica o caminho do campo onde o problema está', () => {
    const r = validateDraft(draft({ proximosPassos: ['Contactar 55 empresas.'] }), pacote);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.path === 'proximosPassos[0]')).toBe(true);
  });
});
