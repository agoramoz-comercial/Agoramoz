import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { ChromeBlob } from '@/components/motion/ChromeBlob';
import { CTA } from '@/content/site';

export function FinalCta({
  title = 'Antes de comprar mais tecnologia, descubra qual sistema produzirá maior impacto.',
  body = 'Partilhe o processo que pretende melhorar. A AGORAMOZ analisará o problema, a viabilidade e o próximo passo recomendado.',
  href = '/diagnostico',
}: {
  title?: string;
  body?: string;
  href?: string;
}) {
  return (
    <div className="relative">
      {/*
        O bolbo de crómio vive AQUI e não no hero.
        Tentei-o primeiro no hero e um teste automático de sobreposição mostrou
        que, a 1024, 1280, 1440 e 1920px, a caixa do canvas apanhava sempre o
        botão secundário e a nota por baixo dele — o hero tem o H1 a toda a
        largura e não sobra vazio nenhum. Esta secção tem o título travado a
        16ch, o que deixa metade direita genuinamente livre. E fica abaixo da
        dobra em todas as páginas, pelo que não toca na janela do LCP.
      */}
      {/*
        Camada de recorte. Sem ela o bolbo sangrava para lá do contentor e
        alargava o DOCUMENTO: `scrollWidth` de 1599px num ecrã de 1440, em sete
        rotas — escondido pelo `overflow-x` do body, mas presente. O recorte
        acontece no limite do contentor; perdem-se uns 60px de sangria e
        ganha-se um documento com a largura do ecrã.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
        <div className="absolute -top-[12%] -right-[12%] h-[26rem] w-[26rem] xl:h-[30rem] xl:w-[30rem]">
          <ChromeBlob />
        </div>
      </div>

      <SplitHeading
        as="h2"
        className="max-w-[16ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
      >
        {title}
      </SplitHeading>

      <div className="rule mt-14 grid gap-10 pt-8 md:grid-cols-12 md:gap-8">
        <p className="text-[length:var(--text-lead)] text-[color:var(--muted)] md:col-span-6">{body}</p>

        <div className="flex flex-col gap-5 md:col-span-6 md:items-end">
          <MagneticButton>
            <Button asChild size="lg">
              <Link href={href}>
                {CTA.primary}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Button>
          </MagneticButton>
          <p className="rule-label text-[color:var(--muted)] md:text-right">
            Sem pressão comercial · Sem soluções genéricas · Sem promessas impossíveis
          </p>
        </div>
      </div>
    </div>
  );
}
