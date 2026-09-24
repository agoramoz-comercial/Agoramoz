import { describe, expect, it } from 'vitest';
import {
  CAMINHO_PRIVADO,
  UTM_MAX,
  sanitizarCaminho,
  sanitizarInstante,
  sanitizarReferenciador,
  sanitizarUtm,
} from './sanitize';

/**
 * Estes valores vêm inteiramente do URL — de quem escreveu a ligação — e vão
 * parar a uma tabela da base, a uma tabela HTML no admin e a um filtro de
 * consulta. São dados não confiáveis, e os testes tratam-nos como tal.
 */

const HOSTIS = [
  '<script>alert(1)</script>',
  '</script><script>',
  '"><img src=x onerror=alert(1)>',
  "' or 1=1--",
  '%3Cscript%3E',
  '%253Cscript%253E',
  'campanha,outra',
  'campanha(1)',
  'campanha)',
  'campanha%',
  '../../etc/passwd',
  'café',
  'ｇoogle',
  'a b c',
  'a+b',
  '\u0000nulo',
  'x'.repeat(UTM_MAX + 1),
];

describe('sanitizarUtm', () => {
  it.each([
    ['google', 'google'],
    ['GBP', 'gbp'],
    ['  Lancamento_Q1  ', 'lancamento_q1'],
    ['energia-2026', 'energia-2026'],
    ['a.b_c-d', 'a.b_c-d'],
    ['x'.repeat(UTM_MAX), 'x'.repeat(UTM_MAX)],
  ])('aceita %j → %j', (entrada, esperado) => {
    expect(sanitizarUtm(entrada)).toBe(esperado);
  });

  it('recusa um fragmento de query colado como valor, em vez de o salvar', () => {
    // Salvar `?utm_source=x` para `x` seria fabricar um valor que ninguém
    // enviou — a mesma objecção que se faz a truncar.
    expect(sanitizarUtm('?utm_source=x')).toBeNull();
    expect(sanitizarUtm('utm_source=x')).toBeNull();
  });

  it.each(HOSTIS)('recusa %j', (entrada) => {
    expect(sanitizarUtm(entrada)).toBeNull();
  });

  it.each(['null', 'undefined', 'none', 'not-set', '-', '.'])(
    'recusa %j, que passa no conjunto de caracteres mas não significa nada',
    (entrada) => {
      expect(sanitizarUtm(entrada)).toBeNull();
    },
  );

  it.each([[null], [undefined], [42], [{}], [[]], [true]])('recusa o não-texto %j', (entrada) => {
    expect(sanitizarUtm(entrada)).toBeNull();
  });

  it('recusa 65 caracteres em vez de truncar para 64', () => {
    /**
     * A asserção que separa recusar de truncar. Um valor truncado parece
     * legítimo, agrupa-se com outra campanha que partilhe o prefixo, e
     * ninguém descobre que o relatório está errado.
     */
    const longo = 'a'.repeat(UTM_MAX + 1);
    expect(sanitizarUtm(longo)).toBeNull();
    expect(sanitizarUtm(longo)).not.toBe('a'.repeat(UTM_MAX));
  });

  it('nunca fabrica um valor: o que sai é o que entrou em minúsculas, ou null', () => {
    /**
     * A propriedade mais importante deste ficheiro. Um sanitizador que remove
     * caracteres devolve um valor que ninguém enviou — e `<scr<script>ipt>`
     * limpo por remoção torna-se `<script>`. Aqui, ou o valor passa inteiro,
     * ou não passa.
     */
    for (const entrada of [...HOSTIS, 'google', 'GBP', '  x  ', 'a'.repeat(200)]) {
      const saida = sanitizarUtm(entrada);
      if (saida !== null) {
        expect(saida).toBe(entrada.trim().toLowerCase());
      }
    }
  });
});

describe('sanitizarCaminho', () => {
  it.each([
    ['/', '/'],
    ['/diagnostico', '/diagnostico'],
    ['/mz/energia-mineracao', '/mz/energia-mineracao'],
    ['/solucoes/agentes-ia', '/solucoes/agentes-ia'],
  ])('aceita %j', (entrada, esperado) => {
    expect(sanitizarCaminho(entrada)).toBe(esperado);
  });

  it('deita fora a query string inteira', () => {
    // É onde a informação pessoal aterra. Nenhuma pergunta de negócio precisa
    // dela que o caminho não responda.
    expect(sanitizarCaminho('/diagnostico?email=alguem@empresa.com&utm_source=x')).toBe('/diagnostico');
    expect(sanitizarCaminho('/diagnostico#seccao')).toBe('/diagnostico');
  });

  it.each(['/admin', '/admin/oportunidades', '/api/diagnostico', '/documento/abc123'])(
    'marca %j como privado em vez de o gravar',
    (entrada) => {
      expect(sanitizarCaminho(entrada)).toBe(CAMINHO_PRIVADO);
    },
  );

  it('um token de documento nunca chega à base', () => {
    /**
     * O caso que motiva a lista de prefixos privados: um documento de
     * diagnóstico é endereçado por token, e o token viaja no caminho. Gravá-lo
     * poria um segredo numa tabela lida por toda a equipa.
     */
    const caminho = sanitizarCaminho('/documento/8f14e45fceea167a5a36dedd4bea2543');
    expect(caminho).toBe(CAMINHO_PRIVADO);
    expect(caminho).not.toContain('8f14e45');
  });

  it.each([
    ['//evil.com', 'relativo ao protocolo é um URL absoluto disfarçado'],
    ['/../etc/passwd', 'travessia'],
    ['sem-barra', 'não começa por barra'],
    ['/CAIXA-ALTA', 'maiúsculas: não é uma rota nossa, e normalizar inventaria uma'],
    ['/a b', 'espaço'],
    ['', 'vazio'],
  ])('recusa %j (%s)', (entrada) => {
    expect(sanitizarCaminho(entrada)).toBeNull();
  });
});

describe('sanitizarReferenciador', () => {
  it('guarda o host, nunca o URL completo', () => {
    /**
     * O URL de onde alguém veio pode transportar a query string DESSE site —
     * o termo pesquisado, um identificador de sessão, um endereço de correio.
     */
    expect(sanitizarReferenciador('https://www.google.com/search?q=alguem@empresa.com', 'agoramoz.com')).toBe(
      'www.google.com',
    );
  });

  it('navegação interna não é uma referência', () => {
    expect(sanitizarReferenciador('https://agoramoz.com/solucoes', 'agoramoz.com')).toBeNull();
  });

  it.each(['', 'nao-e-url', 'javascript:alert(1)', 'http://localhost', 'https://a'])(
    'recusa %j',
    (entrada) => {
      expect(sanitizarReferenciador(entrada, 'agoramoz.com')).toBeNull();
    },
  );
});

describe('sanitizarInstante', () => {
  const agora = new Date('2026-09-24T12:00:00.000Z');

  it('aceita um instante plausível e trunca ao segundo', () => {
    expect(sanitizarInstante('2026-09-24T11:59:30.456Z', agora)).toBe('2026-09-24T11:59:30.000Z');
  });

  it('recusa um relógio adiantado mais de cinco minutos', () => {
    // O relógio do browser não é de confiança.
    expect(sanitizarInstante('2026-09-24T12:10:00.000Z', agora)).toBeNull();
  });

  it('tolera desvio pequeno', () => {
    expect(sanitizarInstante('2026-09-24T12:02:00.000Z', agora)).not.toBeNull();
  });

  it.each(['', 'ontem', '2026-13-45', '0'])('recusa %j', (entrada) => {
    expect(sanitizarInstante(entrada, agora)).toBeNull();
  });
});
