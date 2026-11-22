import type { Enquadramento } from './enquadramento';

/**
 * O corpo do e-mail: HTML em tabelas com estilos em linha (o que os clientes
 * de e-mail respeitam), com a identidade v3, e a alternativa em texto.
 *
 * - Fundo escuro declarado em cada célula e `color-scheme: dark`: os clientes
 *   que invertem cores (Gmail, Outlook) não deixam texto claro em fundo claro.
 * - Sem imagens remotas e sem pixel de seguimento.
 * - Todo o texto da pessoa é escapado.
 */

const COR = { noite: '#0b0a09', noite2: '#151311', papel: '#efe8da', cinza: '#a8a092', ambar: '#e9a35c', linha: '#2a2724' };
const FONTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const linha = (rotulo: string, valor: string) => `
            <tr>
              <td style="padding:10px 0;border-top:1px solid ${COR.linha};font:400 12px/1.5 ${FONTE};color:${COR.cinza};width:38%;vertical-align:top">${escapar(rotulo)}</td>
              <td style="padding:10px 0;border-top:1px solid ${COR.linha};font:400 14px/1.5 ${FONTE};color:${COR.papel};vertical-align:top">${escapar(valor)}</td>
            </tr>`;

const etiqueta = (n: string, texto: string) => `
          <tr><td style="padding:32px 0 10px;font:600 11px/1 ${FONTE};letter-spacing:1px;text-transform:uppercase;color:${COR.ambar}">(${n})&nbsp;&nbsp;${escapar(texto)}</td></tr>`;

export function htmlDoEmail(doc: Enquadramento, respostaPara: string): string {
  const t = doc.t;
  const ola = t.ola.replace('{nome}', doc.nome);
  const assunto = encodeURIComponent(t.assunto.replace('{empresa}', doc.empresa));
  const criterios = doc.elegibilidade
    .map((c) => {
      const ok = c.estado === 'indicado';
      const pilula = ok
        ? `<span style="display:inline-block;padding:3px 10px;border:1px solid ${COR.papel};border-radius:999px;font:600 11px/1.4 ${FONTE};color:${COR.papel}">${escapar(t.estados.indicado)}</span>`
        : `<span style="display:inline-block;padding:3px 10px;background:${COR.ambar};border-radius:999px;font:600 11px/1.4 ${FONTE};color:${COR.noite}">${escapar(t.estados.aConfirmar)}</span>`;
      return `
            <tr>
              <td style="padding:12px 0;border-top:1px solid ${COR.linha};vertical-align:top">
                <div style="font:600 14px/1.4 ${FONTE};color:${COR.papel}">${escapar(c.titulo)}</div>
                <div style="font:400 12px/1.5 ${FONTE};color:${COR.cinza}">${escapar(c.detalhe)}</div>
              </td>
              <td style="padding:12px 0;border-top:1px solid ${COR.linha};text-align:right;vertical-align:top;white-space:nowrap">${pilula}</td>
            </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="${doc.idioma === 'pt' ? 'pt-PT' : 'en-GB'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapar(t.assunto.replace('{empresa}', doc.empresa))}</title>
</head>
<body style="margin:0;padding:0;background:${COR.noite};color-scheme:dark">
<div style="display:none;max-height:0;overflow:hidden">${escapar(t.subtitulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.noite}">
  <tr>
    <td align="center" style="padding:32px 16px;background:${COR.noite}">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${COR.noite}">
        <tr><td style="padding:0 0 28px;font:700 13px/1 ${FONTE};letter-spacing:1px;color:${COR.papel}">AGORAMOZ</td></tr>
        <tr><td style="padding:0 0 6px;font:600 11px/1 ${FONTE};letter-spacing:1px;text-transform:uppercase;color:${COR.ambar}">${escapar(t.fase)}</td></tr>
        <tr><td style="padding:8px 0 4px;font:500 34px/1.05 ${FONTE};letter-spacing:-1px;color:${COR.papel}">${escapar(t.titulo)}</td></tr>
        <tr><td style="padding:0 0 24px;font:400 15px/1.5 ${FONTE};color:${COR.cinza}">${escapar(t.subtitulo)}</td></tr>
        <tr><td style="padding:0 0 12px;font:400 15px/1.6 ${FONTE};color:${COR.papel}">${escapar(ola)}</td></tr>
        <tr><td style="padding:0 0 16px;font:400 15px/1.6 ${FONTE};color:${COR.papel}">${escapar(t.abertura)}</td></tr>
        <tr><td style="padding:12px 16px;border-left:2px solid ${COR.ambar};background:${COR.noite2};font:400 13px/1.55 ${FONTE};color:${COR.cinza}">${escapar(t.preliminar)}</td></tr>
        ${etiqueta('01', t.seccoes.problema)}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linha(t.campos.processos, doc.problema.processos.join(' · '))}${linha(
            t.campos.impacto,
            doc.problema.impacto || t.campos.naoIndicado,
          )}${doc.problema.consequencias.length ? linha(t.campos.consequencias, doc.problema.consequencias.join(' · ')) : ''}</table>
        </td></tr>
        ${etiqueta('02', `${t.seccoes.contexto} · ${t.seccoes.sponsor}`)}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linha(t.campos.mercado, doc.contexto.mercado)}${linha(
            t.campos.setor,
            doc.contexto.setor,
          )}${linha(t.campos.papel, doc.sponsor.papel)}${linha(t.campos.prazo, doc.sponsor.prazo)}</table>
        </td></tr>
        ${etiqueta('03', t.seccoes.elegibilidade)}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${criterios}</table>
        </td></tr>
        ${etiqueta('04', t.seccoes.passos)}
        ${doc.passos
          .map(
            (p, i) =>
              `<tr><td style="padding:6px 0;font:400 14px/1.55 ${FONTE};color:${COR.papel}"><span style="color:${COR.ambar}">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;${escapar(p)}</td></tr>`,
          )
          .join('')}
        <tr><td style="padding:28px 0 8px">
          <a href="mailto:${escapar(respostaPara)}?subject=${assunto}" style="display:inline-block;padding:14px 26px;background:${COR.papel};border-radius:999px;font:600 14px/1 ${FONTE};color:${COR.noite};text-decoration:none">${escapar(t.cta)} &rarr;</a>
        </td></tr>
        <tr><td style="padding:8px 0 0;font:400 13px/1.55 ${FONTE};color:${COR.cinza}">${escapar(t.anexo)} ${escapar(t.responder)}</td></tr>
        <tr><td style="padding:28px 0 0;border-top:1px solid ${COR.linha};font:400 12px/1.6 ${FONTE};color:${COR.cinza}">
          <span style="color:${COR.papel}">${doc.garantias.map(escapar).join(' &middot; ')}</span><br>${escapar(t.rodape)}
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function textoDoEmail(doc: Enquadramento): string {
  const t = doc.t;
  const l: string[] = [
    t.ola.replace('{nome}', doc.nome),
    '',
    t.abertura,
    '',
    t.preliminar,
    '',
    `(01) ${t.seccoes.problema}`,
    `- ${t.campos.processos}: ${doc.problema.processos.join(', ')}`,
    `- ${t.campos.impacto}: ${doc.problema.impacto || t.campos.naoIndicado}`,
    '',
    `(02) ${t.seccoes.contexto}`,
    `- ${t.campos.mercado}: ${doc.contexto.mercado}`,
    `- ${t.campos.setor}: ${doc.contexto.setor}`,
    `- ${t.campos.papel}: ${doc.sponsor.papel}`,
    `- ${t.campos.prazo}: ${doc.sponsor.prazo}`,
    '',
    `(03) ${t.seccoes.elegibilidade}`,
    ...doc.elegibilidade.map(
      (c) => `- ${c.titulo}: ${c.estado === 'indicado' ? t.estados.indicado : t.estados.aConfirmar} (${c.detalhe})`,
    ),
    '',
    `(04) ${t.seccoes.passos}`,
    ...doc.passos.map((p, i) => `${i + 1}. ${p}`),
    '',
    t.anexo,
    t.responder,
    '',
    doc.garantias.join(' · '),
    t.rodape,
  ];
  return l.join('\n');
}
