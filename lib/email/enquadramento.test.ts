import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { LeadInput } from '@/lib/forms/lead-schema';
import { construirEnquadramento, nomeDoFicheiro } from './enquadramento';
import { reuniao } from './cta';
import { LOGO_EMAIL, escapar, htmlDoEmail, textoDoEmail } from './html';
import { TEXTOS } from './textos';
import { gerarPdfEnquadramento } from './pdf';

const BASE: LeadInput = {
  country: 'mz',
  sector: 'logistica',
  processToImprove: ['operacoes', 'integracao'],
  companySize: '10-49',
  decisionTimeframe: '1-3-meses',
  decisionRole: 'decisor',
  investmentBand: 'mz-2',
  problemImpact: 'Os pedidos chegam por WhatsApp e ninguém sabe quem responde.',
  problemConsequences: ['atraso', 'erro'],
  currentSystems: 'Excel e WhatsApp',
  desiredDecision: 'Saber se vale a pena um portal de pedidos',
  name: 'Ana Teste',
  workEmail: 'ana@exemplo.co.mz',
  phone: '+258840000000',
  company: 'Transportes Exemplo, Lda.',
  currentWebsite: '',
  consent: true,
  idioma: 'pt',
} as LeadInput;

/** Todos os números (sequências de dígitos) de um texto. */
const numeros = (s: string) => new Set(s.match(/\d+/g) ?? []);

const CTA_EMAIL = reuniao(TEXTOS.pt, {
  calOrigem: 'https://cal.com',
  nome: 'Ana',
  email: 'ana@exemplo.co.mz',
  responderPara: 'comercial@agoramoz.com',
});

describe('enquadramento preliminar: botão de reunião', () => {
  it('sem CAL_LINK, escreve à equipa por e-mail', () => {
    expect(CTA_EMAIL.cal).toBe(false);
    expect(CTA_EMAIL.url).toMatch(/^mailto:comercial@agoramoz\.com\?subject=/);
    expect(CTA_EMAIL.rotulo).toBe(TEXTOS.pt.ctaEscrever);
  });

  it('com CAL_LINK, marca no Cal.com com nome e e-mail preenchidos', () => {
    const r = reuniao(TEXTOS.en, {
      calOrigem: 'https://cal.com',
      calLink: 'agoramoz/especialista',
      nome: 'Ana Machava',
      email: 'ana@exemplo.co.mz',
      responderPara: 'comercial@agoramoz.com',
    });
    expect(r.cal).toBe(true);
    expect(r.rotulo).toBe('Book a meeting with a specialist');
    const u = new URL(r.url);
    expect(u.origin + u.pathname).toBe('https://cal.com/agoramoz/especialista');
    expect(u.searchParams.get('name')).toBe('Ana Machava');
    expect(u.searchParams.get('email')).toBe('ana@exemplo.co.mz');
  });

  it('o HTML e o texto levam o botão; o HTML leva o logótipo no topo', () => {
    const doc = construirEnquadramento(BASE, 'pt');
    const cal = reuniao(doc.t, { calOrigem: 'https://cal.com', calLink: 'agoramoz/x', nome: 'Ana', email: 'a@b.co', responderPara: 'c@d.co' });
    const html = htmlDoEmail(doc, cal);
    expect(html).toContain(escapar(cal.url));
    expect(html).toContain('Marcar reunião com um especialista');
    expect(html.indexOf(LOGO_EMAIL)).toBeLessThan(html.indexOf(doc.t.titulo, html.indexOf('<body')));
    expect(textoDoEmail(doc, cal)).toContain(cal.url);
  });
});

describe('enquadramento preliminar: conteúdo', () => {
  it('vem só das respostas e do catálogo, na língua pedida', () => {
    const doc = construirEnquadramento(BASE, 'pt');
    expect(doc.nome).toBe('Ana Teste');
    expect(doc.empresa).toBe('Transportes Exemplo, Lda.');
    expect(doc.problema.processos).toEqual(['Operações', 'Integração de sistemas']);
    expect(doc.problema.impacto).toBe(BASE.problemImpact);
    expect(doc.problema.consequencias).toEqual(['Atraso', 'Erro']);
    expect(doc.contexto.mercado).toBe('Moçambique');
    expect(doc.sponsor.papel).toBe('Decido');
    expect(doc.sponsor.faixa).toBe('250 000 – 750 000 MZN');
    expect(doc.entregas).toHaveLength(10);
    expect(doc.t.titulo).toBe('Enquadramento preliminar');

    const en = construirEnquadramento({ ...BASE, idioma: 'en' } as LeadInput, 'en');
    expect(en.t.titulo).toBe('Preliminary framing');
    expect(en.contexto.mercado).toBe('Mozambique');
    expect(en.sponsor.faixa).toBe('MZN 250,000 – 750,000');
  });

  it('nunca mostra a pontuação nem o tier (D-15)', () => {
    const doc = construirEnquadramento(BASE, 'pt');
    const tudo = JSON.stringify(doc) + textoDoEmail(doc, CTA_EMAIL) + htmlDoEmail(doc, CTA_EMAIL);
    expect(tudo).not.toMatch(/\b(tier|score|pontua)/i);
  });

  it('não inventa números: todo o número do texto vem das respostas ou do catálogo', () => {
    const doc = construirEnquadramento(BASE, 'pt');
    // Os URLs (o botão) ficam de fora: «%20» não é um número do documento.
    const texto = textoDoEmail(doc, CTA_EMAIL).replace(/\S+:\/\/\S+|mailto:\S+/g, '');
    // Números permitidos: os da faixa e da dimensão escolhidas e as numerações 1–10 das listas.
    const permitidos = new Set([...numeros(doc.sponsor.faixa), ...numeros(doc.contexto.dimensao), ...numeros(doc.sponsor.prazo)]);
    for (let i = 1; i <= 10; i++) permitidos.add(String(i)).add(String(i).padStart(2, '0'));
    for (const n of numeros(texto)) expect(permitidos, `número sem origem: ${n}`).toContain(n);
  });

  it('marca «a confirmar» o que a pessoa não deu', () => {
    const doc = construirEnquadramento(
      { ...BASE, problemImpact: '', decisionRole: 'pesquisa', decisionTimeframe: 'sem-data', investmentBand: 'mz-0' } as LeadInput,
      'pt',
    );
    expect(doc.elegibilidade.map((c) => c.estado)).toEqual(['a-confirmar', 'a-confirmar', 'a-confirmar', 'a-confirmar']);
    const completo = construirEnquadramento(BASE, 'pt');
    expect(completo.elegibilidade.every((c) => c.estado === 'indicado')).toBe(true);
  });

  it('escapa o texto da pessoa no HTML', () => {
    const doc = construirEnquadramento({ ...BASE, company: '<script>x</script>' } as LeadInput, 'pt');
    const html = htmlDoEmail(doc, CTA_EMAIL);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain(escapar('<script>x</script>'));
    // A única imagem é o logótipo alojado, com texto alternativo.
    expect(html.match(/<img/gi)).toHaveLength(1);
    expect(html).toContain(`src="${LOGO_EMAIL}"`);
    expect(html).toContain('alt="AGORAMOZ"');
  });

  it('o nome do ficheiro é seguro', () => {
    expect(nomeDoFicheiro(construirEnquadramento(BASE, 'pt'))).toBe('Enquadramento-AGORAMOZ-Transportes-Exemplo-Lda.pdf');
  });
});

describe('enquadramento preliminar: PDF', () => {
  it('gera um A4 válido, mesmo com caracteres que a Helvetica não tem', async () => {
    const doc = construirEnquadramento({ ...BASE, problemImpact: 'Bloqueio 🚚 → atraso; 数据' } as LeadInput, 'pt');
    const bytes = await gerarPdfEnquadramento(doc, new Date('2026-11-22T10:00:00Z'));
    const lido = await PDFDocument.load(bytes);
    expect(lido.getPageCount()).toBeGreaterThanOrEqual(3);
    const { width, height } = lido.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    expect(lido.getTitle()).toContain('Transportes Exemplo');
  });

  it('um texto longo passa para páginas seguintes em vez de sair da página', async () => {
    const longo = 'Processo manual repetido. '.repeat(60);
    const bytes = await gerarPdfEnquadramento(construirEnquadramento({ ...BASE, problemImpact: longo } as LeadInput, 'pt'));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(3);
  });
});

describe('enviarEnquadramento', () => {
  const guardado = { ...process.env };
  let saidas: string[] = [];
  beforeEach(() => {
    saidas = [];
    for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void saidas.push(a.map(String).join(" ")));
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...guardado };
    vi.restoreAllMocks();
  });

  async function carregar(env: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return (await import('./enviar')).enviarEnquadramento;
  }

  it('desligado por omissão: não chama a rede', async () => {
    const enviar = await carregar({ EMAIL_LEADS: undefined, RESEND_API_KEY: undefined });
    const fetcher = vi.fn();
    const r = await enviar({ input: BASE, diagnosticId: 'd1', correlationId: 'c1', fetcher: fetcher as unknown as typeof fetch });
    expect(r).toEqual({ enviado: false, motivo: 'desligado' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('ligado sem chave: não envia', async () => {
    const enviar = await carregar({ EMAIL_LEADS: 'on', RESEND_API_KEY: undefined });
    const fetcher = vi.fn();
    const r = await enviar({ input: BASE, diagnosticId: 'd1', correlationId: 'c1', fetcher: fetcher as unknown as typeof fetch });
    expect(r).toEqual({ enviado: false, motivo: 'sem-chave' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('envia com chave de idempotência por diagnóstico, PDF anexo, e sem PII nos logs', async () => {
    const enviar = await carregar({ EMAIL_LEADS: 'on', RESEND_API_KEY: 're_teste_0123456789' });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }));
    const r = await enviar({ input: BASE, diagnosticId: 'diag-42', correlationId: 'c1', fetcher: fetcher as unknown as typeof fetch });
    expect(r).toEqual({ enviado: true, id: 'msg_1' });

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const h = init.headers as Record<string, string>;
    expect(h['idempotency-key']).toBe('enquadramento/diag-42');
    const corpo = JSON.parse(String(init.body));
    expect(corpo.from).toBe('AGORAMOZ <comercial@agoramoz.com>');
    expect(corpo.reply_to).toBe('comercial@agoramoz.com');
    expect(corpo.to).toEqual(['ana@exemplo.co.mz']);
    expect(corpo.attachments[0].filename).toMatch(/\.pdf$/);
    expect(Buffer.from(corpo.attachments[0].content, 'base64').subarray(0, 5).toString()).toBe('%PDF-');

    const logs = saidas.join('\n');
    expect(logs).toContain('email.enquadramento');
    for (const pii of ['ana@exemplo.co.mz', 'Ana Teste', 'Transportes Exemplo', 're_teste_0123456789', '+258840000000'])
      expect(logs).not.toContain(pii);
  });

  it('uma falha da Resend não lança: devolve «falhou» e regista o código', async () => {
    const enviar = await carregar({ EMAIL_LEADS: 'on', RESEND_API_KEY: 're_teste_0123456789' });
    const fetcher = vi.fn(async () => new Response('{}', { status: 422 }));
    const r = await enviar({ input: BASE, diagnosticId: 'd1', correlationId: 'c1', fetcher: fetcher as unknown as typeof fetch });
    expect(r).toEqual({ enviado: false, motivo: 'falhou' });
    expect(saidas.join('\n')).toContain('http_422');
  });
});
