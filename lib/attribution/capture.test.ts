import { describe, expect, it } from 'vitest';
import { construirAtribuicao } from './capture';
import { derivarCanal } from './channel';
import type { Atribuicao } from './types';

const HOST = 'agoramoz.com';
const T0 = new Date('2026-09-24T10:00:00.000Z');
const T1 = new Date('2026-09-24T10:05:00.000Z');

const chegar = (url: string, opcoes: { referrer?: string; existente?: Atribuicao | null; agora?: Date } = {}) =>
  construirAtribuicao({
    url,
    referrer: opcoes.referrer ?? '',
    hostProprio: HOST,
    existente: opcoes.existente ?? null,
    agora: opcoes.agora ?? T0,
  });

const DO_PERFIL = `https://${HOST}/perfil?utm_source=google&utm_medium=organic&utm_campaign=gbp`;

describe('primeiro toque', () => {
  it('guarda a campanha, a página de entrada e a hora', () => {
    const a = chegar(DO_PERFIL);
    expect(a.utm_source).toBe('google');
    expect(a.utm_medium).toBe('organic');
    expect(a.utm_campaign).toBe('gbp');
    expect(a.landing_page).toBe('/perfil');
    expect(a.first_touch_at).toBe(T0.toISOString());
    expect(a.last_touch_at).toBe(T0.toISOString());
  });

  it('nunca grava a query string na página de entrada', () => {
    const a = chegar(`https://${HOST}/diagnostico?email=alguem@empresa.com`);
    expect(a.landing_page).toBe('/diagnostico');
    expect(JSON.stringify(a)).not.toContain('alguem@empresa.com');
  });

  it('guarda o host do referenciador, não o URL', () => {
    const a = chegar(`https://${HOST}/`, { referrer: 'https://www.linkedin.com/feed/?q=segredo' });
    expect(a.referrer).toBe('www.linkedin.com');
    expect(JSON.stringify(a)).not.toContain('segredo');
  });

  it('um caminho privado nunca é gravado', () => {
    const a = chegar(`https://${HOST}/documento/8f14e45fceea167a5a36dedd4bea2543`);
    expect(a.landing_page).toBe('(privado)');
    expect(JSON.stringify(a)).not.toContain('8f14e45');
  });
});

describe('navegação seguinte', () => {
  const primeiro = chegar(DO_PERFIL);

  it('o último toque actualiza', () => {
    const b = chegar(`https://${HOST}/solucoes`, { existente: primeiro, agora: T1 });
    expect(b.last_touch_at).toBe(T1.toISOString());
  });

  it('uma ligação interna NÃO apaga a campanha', () => {
    /**
     * A regra que decide se a atribuição vale alguma coisa. Sem ela, toda a
     * origem se perderia ao primeiro clique interno — que acontece sempre,
     * porque o formulário está noutra página.
     */
    const b = chegar(`https://${HOST}/solucoes`, { existente: primeiro, agora: T1 });
    expect(b.utm_campaign).toBe('gbp');
    expect(b.landing_page).toBe('/perfil');
  });

  it('o primeiro toque sobrevive a uma campanha nova', () => {
    const b = chegar(`https://${HOST}/?utm_source=linkedin&utm_campaign=lancamento`, {
      existente: primeiro,
      agora: T1,
    });
    expect(b.utm_campaign).toBe('lancamento');
    expect(b.first_touch_at).toBe(T0.toISOString());
  });

  it('a página de entrada acompanha a campanha nova', () => {
    const b = chegar(`https://${HOST}/contactos?utm_source=linkedin`, { existente: primeiro, agora: T1 });
    expect(b.landing_page).toBe('/contactos');
  });
});

describe('valores hostis no URL', () => {
  it('um UTM forjado fica nulo e não impede o resto', () => {
    const a = chegar(`https://${HOST}/?utm_source=%3Cscript%3Ealert(1)%3C/script%3E&utm_campaign=gbp`);
    expect(a.utm_source).toBeNull();
    expect(a.utm_campaign).toBe('gbp');
    expect(JSON.stringify(a)).not.toContain('script');
  });

  it('um URL impossível não rebenta', () => {
    expect(() => chegar('nem-sequer-um-url')).not.toThrow();
  });
});

describe('derivarCanal', () => {
  it.each([
    ['sem atribuição', null, 'desconhecido'],
    ['campanha gbp', { utm_campaign: 'gbp' }, 'gbp'],
    ['outra campanha', { utm_source: 'linkedin', utm_medium: 'cpc' }, 'campanha'],
    ['referência social', { referrer: 'www.linkedin.com' }, 'social'],
    ['pesquisa', { referrer: 'www.google.co.mz' }, 'organico'],
    ['outro site', { referrer: 'algum-blogue.co.mz' }, 'referencia'],
    ['sem nada', {}, 'directo'],
  ])('%s → %s', (_, parcial, esperado) => {
    const a =
      parcial === null
        ? null
        : ({
            utm_source: null,
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            landing_page: null,
            referrer: null,
            first_touch_at: null,
            last_touch_at: T0.toISOString(),
            ...parcial,
          } as Atribuicao);

    expect(derivarCanal(a)).toBe(esperado);
  });

  it('gbp ganha a qualquer referenciador', () => {
    /**
     * O Google envia o mesmo referenciador quer a pessoa venha do perfil de
     * empresa quer da pesquisa normal. A etiqueta no URL do perfil é a única
     * coisa que os distingue — por isso ganha à derivação por referenciador.
     */
    const a = chegar(DO_PERFIL, { referrer: 'https://www.google.com/' });
    expect(derivarCanal(a)).toBe('gbp');
  });
});
