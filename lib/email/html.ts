import type { Reuniao } from './cta';
import type { Enquadramento } from './enquadramento';

/**
 * O corpo do e-mail: HTML em tabelas com estilos em linha (o que os clientes
 * de e-mail respeitam), e a alternativa em texto.
 *
 * - Design dos relatórios ZABATAINA (como o PDF): cabeçalho azul com o
 *   logótipo, corpo branco, tabelas zebra, botão azul.
 * - Uma única imagem remota (o logótipo, com texto alternativo); sem pixel
 *   de seguimento.
 * - Todo o texto da pessoa é escapado.
 */

/** Tokens ZABATAINA (reports/assets/report.css), como o PDF em anexo. */
const COR = {
  azul: '#1D2BE6',
  azulFundo: '#131C9C',
  claro: '#DDE0FF',
  papel: '#F4F4F6',
  branco: '#FFFFFF',
  zebra: '#ECEDF8',
  lilas: '#C8CAEE',
  tinta: '#0C0C10',
  texto2: '#55555F',
  muted: '#8A8A94',
  regra: '#CFCFD7',
  bom: '#1E8E4E',
  aviso: '#9A7200',
};
const FONTE = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
/** PNG alojado (os clientes de e-mail bloqueiam SVG): marca + palavra, a branco. */
export const LOGO_EMAIL = 'https://agoramoz.com/brand/email-logo-branco.png';

export function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const linha = (rotulo: string, valor: string, i: number) => `
            <tr>
              <td style="padding:10px 12px;border-top:1px solid ${COR.regra};background:${i % 2 ? COR.zebra : COR.branco};font:600 12px/1.5 ${FONTE};color:${COR.tinta};width:38%;vertical-align:top">${escapar(rotulo)}</td>
              <td style="padding:10px 12px;border-top:1px solid ${COR.regra};background:${i % 2 ? COR.zebra : COR.branco};font:400 13px/1.5 ${FONTE};color:${COR.tinta};vertical-align:top">${escapar(valor)}</td>
            </tr>`;

const etiqueta = (n: string, texto: string) => `
          <tr><td style="padding:30px 0 10px;font:600 11px/1 ${FONTE};letter-spacing:1px;text-transform:uppercase;color:${COR.tinta}">${n}&nbsp;&middot;&nbsp;${escapar(texto)}</td></tr>`;

/** HTML do e-mail. `cta` vem de `reuniao()` (Cal.com ou e-mail à equipa). */
export function htmlDoEmail(doc: Enquadramento, cta: Reuniao): string {
  const t = doc.t;
  const ola = t.ola.replace('{nome}', doc.nome);
  const indicados = doc.elegibilidade.filter((c) => c.estado === 'indicado').length;
  const total = doc.elegibilidade.length;
  const criterios = doc.elegibilidade
    .map((c, i) => {
      const ok = c.estado === 'indicado';
      const cor = ok ? COR.bom : COR.aviso;
      const pilula = `<span style="display:inline-block;padding:3px 10px;background:${ok ? '#E3F2E9' : '#F7EED2'};font:600 11px/1.4 ${FONTE};color:${cor}">${escapar(ok ? t.estados.indicado : t.estados.aConfirmar)}</span>`;
      return `
            <tr>
              <td style="padding:12px;border-top:1px solid ${COR.regra};background:${i % 2 ? COR.zebra : COR.branco};vertical-align:top">
                <div style="font:600 13px/1.4 ${FONTE};color:${COR.tinta}">${escapar(c.titulo)}</div>
                <div style="font:400 12px/1.5 ${FONTE};color:${COR.texto2}">${escapar(c.detalhe)}</div>
              </td>
              <td style="padding:12px;border-top:1px solid ${COR.regra};background:${i % 2 ? COR.zebra : COR.branco};text-align:right;vertical-align:top;white-space:nowrap">${pilula}</td>
            </tr>`;
    })
    .join('');
  const botao = `<a href="${escapar(cta.url)}" style="display:inline-block;padding:15px 26px;background:${COR.azul};font:600 14px/1 ${FONTE};color:${COR.branco};text-decoration:none">${escapar(cta.rotulo)} &rarr;</a>`;

  return `<!doctype html>
<html lang="${doc.idioma === 'pt' ? 'pt-PT' : 'en-GB'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapar(t.assunto.replace('{empresa}', doc.empresa))}</title>
</head>
<body style="margin:0;padding:0;background:${COR.papel}">
<div style="display:none;max-height:0;overflow:hidden">${escapar(t.subtitulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.papel}">
  <tr>
    <td align="center" style="padding:24px 12px;background:${COR.papel}">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
        <tr><td style="background:${COR.azul};padding:28px 32px 34px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td><img src="${LOGO_EMAIL}" width="168" height="34" alt="AGORAMOZ" style="display:block;border:0;width:168px;height:34px;color:${COR.branco};font:700 14px ${FONTE}"></td>
            <td style="text-align:right;font:700 13px/1 ${FONTE};color:${COR.branco}">${escapar(t.ano)}</td>
          </tr></table>
          <div style="padding:44px 0 0;font:600 10px/1 ${FONTE};letter-spacing:1px;text-transform:uppercase;color:${COR.claro}">AGORAMOZ &middot; ${escapar(t.fase)}</div>
          <div style="padding:12px 0 8px;font:300 38px/1.05 ${FONTE};letter-spacing:-1px;color:${COR.branco}">${escapar(t.titulo)}</div>
          <div style="font:400 14px/1.5 ${FONTE};color:${COR.claro}">${escapar(t.subtitulo)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr>
            <td style="padding-right:36px"><div style="font:600 28px/1 ${FONTE};color:${COR.branco}">${indicados}/${total}</div><div style="padding-top:6px;font:400 11px/1.4 ${FONTE};color:${COR.claro}">${escapar(t.kpis.indicados)}</div></td>
            <td style="padding-right:36px"><div style="font:600 28px/1 ${FONTE};color:${COR.branco}">${doc.entregas.length}</div><div style="padding-top:6px;font:400 11px/1.4 ${FONTE};color:${COR.claro}">${escapar(t.kpis.entregas)}</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:${COR.branco};padding:28px 32px 32px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:0 0 12px;font:400 15px/1.6 ${FONTE};color:${COR.tinta}">${escapar(ola)}</td></tr>
            <tr><td style="padding:0 0 16px;font:400 15px/1.6 ${FONTE};color:${COR.tinta}">${escapar(t.abertura)}</td></tr>
            <tr><td style="padding:12px 16px;background:${COR.lilas};font:400 13px/1.55 ${FONTE};color:${COR.tinta}">${escapar(t.preliminar)}</td></tr>
            ${etiqueta('01', t.seccoes.problema)}
            <tr><td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${COR.regra}">${linha(t.campos.processos, doc.problema.processos.join(' · '), 0)}${linha(
                t.campos.impacto,
                doc.problema.impacto || t.campos.naoIndicado,
                1,
              )}${linha(t.campos.mercado, doc.contexto.mercado, 2)}${linha(t.campos.setor, doc.contexto.setor, 3)}${linha(t.campos.papel, doc.sponsor.papel, 4)}${linha(t.campos.prazo, doc.sponsor.prazo, 5)}</table>
            </td></tr>
            ${etiqueta('02', t.seccoes.elegibilidade)}
            <tr><td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${COR.regra}">${criterios}</table>
            </td></tr>
            ${etiqueta('03', t.seccoes.passos)}
            ${doc.passos
              .map(
                (p, i) =>
                  `<tr><td style="padding:6px 0;font:400 14px/1.55 ${FONTE};color:${COR.tinta}"><span style="font-weight:600;color:${COR.azul}">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;${escapar(p)}</td></tr>`,
              )
              .join('')}
            <tr><td style="padding:26px 0 8px">${botao}</td></tr>
            <tr><td style="padding:8px 0 0;font:400 13px/1.55 ${FONTE};color:${COR.texto2}">${escapar(t.anexo)} ${escapar(t.responder)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:${COR.tinta};padding:22px 32px;font:400 12px/1.6 ${FONTE};color:#B9B9C4">
          <span style="color:${COR.branco}">${doc.garantias.map(escapar).join(' &middot; ')}</span><br>${escapar(t.rodape)}
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function textoDoEmail(doc: Enquadramento, cta: Reuniao): string {
  const t = doc.t;
  const l: string[] = [
    `AGORAMOZ · ${t.fase}`,
    t.titulo,
    '',
    t.ola.replace('{nome}', doc.nome),
    '',
    t.abertura,
    '',
    t.preliminar,
    '',
    `01 · ${t.seccoes.problema}`,
    `- ${t.campos.processos}: ${doc.problema.processos.join(', ')}`,
    `- ${t.campos.impacto}: ${doc.problema.impacto || t.campos.naoIndicado}`,
    `- ${t.campos.mercado}: ${doc.contexto.mercado}`,
    `- ${t.campos.setor}: ${doc.contexto.setor}`,
    `- ${t.campos.papel}: ${doc.sponsor.papel}`,
    `- ${t.campos.prazo}: ${doc.sponsor.prazo}`,
    '',
    `02 · ${t.seccoes.elegibilidade}`,
    ...doc.elegibilidade.map(
      (c) => `- ${c.titulo}: ${c.estado === 'indicado' ? t.estados.indicado : t.estados.aConfirmar} (${c.detalhe})`,
    ),
    '',
    `03 · ${t.seccoes.passos}`,
    ...doc.passos.map((p, i) => `${i + 1}. ${p}`),
    '',
    `${cta.rotulo}: ${cta.url}`,
    '',
    t.anexo,
    t.responder,
    '',
    doc.garantias.join(' · '),
    t.rodape,
  ];
  return l.join('\n');
}
