/**
 * IndexNow (D-47): avisar os motores de pesquisa de páginas novas ou mudadas,
 * sem conta nem verificação. Usam-no o Bing, o Yandex, o Seznam e o Naver
 * (partilham os avisos entre si). O Google não o usa: para o Google, o
 * caminho é o sitemap submetido na Search Console.
 *
 * A chave NÃO é um segredo: o protocolo exige que esteja pública, num
 * ficheiro do próprio site (`/indexnow.txt`), para provar que quem avisa é
 * dono do domínio. Por isso vive no código.
 */
export const CHAVE_INDEXNOW = '5f0c2b8e9a4d4c7e8b1a6d3f2e9c0a71';
export const CAMINHO_CHAVE = '/indexnow.txt';
const LIMITE = 10_000;

export function pedidoIndexNow(host: string, urls: readonly string[]) {
  const doHost = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return {
    host,
    key: CHAVE_INDEXNOW,
    keyLocation: `https://${host}${CAMINHO_CHAVE}`,
    urlList: doHost.slice(0, LIMITE),
  };
}
