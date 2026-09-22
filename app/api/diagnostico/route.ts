import { NextResponse } from 'next/server';
import { leadSchema } from '@/lib/forms/lead-schema';
import { scoreLead } from '@/lib/forms/lead-score';

/**
 * Stub acordado para esta fase: valida, pontua e regista. Não persiste.
 *
 * O ponto de ligação a n8n ou CRM fica isolado nesta função — quando o
 * webhook existir, é um fetch aqui e mais nada muda no resto da aplicação.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Honeypot: um bot preenche o campo escondido.
  if (parsed.data.fax) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { score, tier, reasons } = scoreLead(parsed.data);

  console.info('[lead]', {
    country: parsed.data.country,
    sector: parsed.data.sector,
    company: parsed.data.company,
    score,
    tier,
    reasons,
  });

  return NextResponse.json({ ok: true, tier }, { status: 200 });
}
