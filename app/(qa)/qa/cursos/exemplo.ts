import { escreverAula, montarCurso, planear, type Motor, type PedidoCurso } from '@/lib/cursos/ciclo';
import { criarFonte } from '@/lib/cursos/fontes';
import type { Curso, Fonte } from '@/lib/cursos/modelo';
import { responderSimulado } from '@/lib/cursos/simulado';

/**
 * Curso de EXEMPLO para o QA visual: fontes escritas para o teste (não são
 * documentos reais) e o motor simulado, que copia frases das passagens. O
 * ciclo e o verificador são os verdadeiros.
 */

export const TEXTO_EXEMPLO = `# Manual de armazém (texto de exemplo para QA)

O inventário periódico conta todos os artigos do armazém no fim de cada mês, comparando o stock físico com o registo do sistema.

Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa da diferença.

O método FIFO determina que os artigos que entram primeiro saem primeiro, o que reduz as perdas de produtos perecíveis.

Na recepção, a mercadoria é conferida contra a guia de remessa e a entrada é registada no sistema no mesmo dia.

Os artigos novos são arrumados atrás dos antigos, para que o método FIFO se cumpra sem esforço adicional da equipa.

Cada corredor tem uma etiqueta com o código da zona, e cada prateleira um número, para que qualquer artigo seja encontrado em menos de dois minutos.

A contagem cíclica verifica todas as semanas uma parte do armazém, escolhida pelos artigos de maior valor, sem parar a operação.

O relatório mensal de stock mostra as entradas, as saídas, as quebras e o valor imobilizado, e é enviado à direcção financeira.`;

export const PEDIDO_EXEMPLO: PedidoCurso = {
  titulo: 'Gestão de stock no armazém',
  tema: 'Como contar, receber, arrumar e reportar o stock de um armazém, do inventário periódico ao relatório mensal.',
  publico: 'Responsáveis de armazém sem formação prévia (exemplo)',
  nivel: 'iniciacao',
  minutos: 120,
};

export async function cursoExemplo(): Promise<{ curso: Curso; fontes: Fonte[] }> {
  const fontes = [criarFonte(1, 'Manual de armazém (exemplo)', 'md', TEXTO_EXEMPLO)];
  // Passagens curtas, para o exemplo ter várias aulas.
  fontes[0] = { ...fontes[0]!, passagens: (await import('@/lib/cursos/fontes')).partirEmPassagens(TEXTO_EXEMPLO, 'F1', 260) };
  const motor: Motor = async (p) => responderSimulado(p);
  const plano = await planear(motor, PEDIDO_EXEMPLO, fontes);
  const aulas = [];
  for (const [mi, m] of (plano.valor?.modulos ?? []).entries())
    for (const ai of m.aulas.keys())
      aulas.push({
        modulo: mi,
        aula: ai,
        peca: await escreverAula(motor, { pedido: PEDIDO_EXEMPLO, plano: plano.valor!, modulo: mi, aula: ai }, fontes),
      });
  const curso = montarCurso(PEDIDO_EXEMPLO, fontes, { plano, aulas }, new Date('2026-11-17T10:00:00Z'));
  if (!curso) throw new Error('exemplo sem curso');
  return { curso: { ...curso, subtitulo: 'Curso de EXEMPLO para a captura de QA — fontes e conteúdo de teste' }, fontes };
}
