import { CascaInquerito } from '@/components/inqueritos/PaginaInquerito';

/**
 * O grupo `(inquerito)` não aparece no URL: só dá a `/i` a casca própria, sem
 * a de marketing. Os cabeçalhos de `/i` (noindex, no-store, no-referrer)
 * estão em `next.config.ts`, porque o token vai no caminho.
 */
export default function InqueritoLayout({ children }: { children: React.ReactNode }) {
  return <CascaInquerito>{children}</CascaInquerito>;
}
