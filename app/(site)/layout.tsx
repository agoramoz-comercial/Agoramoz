import { SiteChrome } from '@/components/layout/SiteChrome';

/**
 * Layout do site público. O grupo `(site)` não aparece no URL: `/sobre`
 * continua a ser `/sobre`. Serve só para separar o que tem casca de marketing
 * do que não tem — hoje, `/admin`.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
