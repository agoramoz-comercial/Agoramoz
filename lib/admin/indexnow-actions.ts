'use server';

import { redirect } from 'next/navigation';
import sitemap from '@/app/sitemap';
import { requireStaff, podeEscrever } from '@/lib/auth/session';
import { log } from '@/lib/log/logger';
import { SITE_URL } from '@/lib/seo/site';
import { pedidoIndexNow } from '@/lib/seo/indexnow';

/**
 * «Avisar os motores de pesquisa»: envia todas as páginas do sitemap ao
 * IndexNow. Útil depois de publicar páginas novas (como as 1 001 da lei).
 * Só para quem escreve no admin; o resultado volta como mensagem.
 */
export async function avisarMotores(): Promise<void> {
  const sessao = await requireStaff();
  if (!podeEscrever(sessao.papel)) redirect('/admin/trafego?erro=Sem%20permiss%C3%A3o.');
  const host = new URL(SITE_URL).host;
  const corpo = pedidoIndexNow(
    host,
    (await sitemap()).map((e) => e.url),
  );
  let mensagem: string;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });
    log.info('seo.indexnow', { outcome: res.ok ? 'accepted' : 'rejected', status: res.status });
    // 200: recebido; 202: recebido, chave a validar. Os outros dizem o que corrigir.
    mensagem =
      res.status === 200 || res.status === 202
        ? `ok:${corpo.urlList.length}`
        : `erro:O IndexNow respondeu ${res.status}. ${res.status === 403 ? 'A chave ainda não está acessível no site.' : res.status === 429 ? 'Avisos a mais; tente amanhã.' : ''}`;
  } catch {
    log.warn('seo.indexnow', { outcome: 'failed' });
    mensagem = 'erro:Não foi possível contactar o IndexNow agora.';
  }
  const [tipo, valor] = [mensagem.slice(0, mensagem.indexOf(':')), mensagem.slice(mensagem.indexOf(':') + 1)];
  redirect(tipo === 'ok' ? `/admin/trafego?ok=indexnow&n=${valor}` : `/admin/trafego?erro=${encodeURIComponent(valor)}`);
}
