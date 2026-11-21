/**
 * Motor SIMULADO dos cursos, só para testes e QA local (nunca em produção).
 *
 * Não inventa: monta o plano e as aulas copiando frases das passagens que
 * recebe no pedido. Na primeira tentativa de cada peça mete, de propósito,
 * um erro de cada tipo (número inventado, citação adulterada, passagem
 * inexistente, frase sem apoio), para o ciclo ter o que apanhar; quando o
 * pedido traz «REJEITADA» (a lista de falhas), devolve a versão limpa.
 */

interface Pedido {
  readonly tarefa: 'pesquisar_fontes' | 'escrever_fonte' | 'sugerir_tema' | 'planear' | 'escrever_aula';
  readonly prompt: string;
}

const frase = (t0: string) => {
  const t = t0.replace(/^#+\s.*?\)\s+/, '');
  return (t.match(/[^.!?…]{25,}[.!?…]/u)?.[0] ?? t.slice(0, 160)).trim();
};

function passagensDoPrompt(prompt: string, re: RegExp): { id: string; texto: string }[] {
  return [...prompt.matchAll(re)].map((m) => ({ id: m[1]!, texto: m[2]!.replace(/…$/, '').trim() }));
}

/* Textos de EXEMPLO para as fontes simuladas: não descrevem nenhum documento real. */
const PARAGRAFOS = [
  'O inventário periódico conta todos os artigos do armazém no fim de cada mês, comparando o stock físico com o registo do sistema.',
  'Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa da diferença.',
  'O método FIFO determina que os artigos que entram primeiro saem primeiro, o que reduz as perdas de produtos perecíveis.',
  'Na recepção, a mercadoria é conferida contra a guia de remessa e a entrada é registada no sistema no mesmo dia.',
  'Os artigos novos são arrumados atrás dos antigos, para que o método FIFO se cumpra sem esforço adicional da equipa.',
  'A contagem cíclica verifica todas as semanas uma parte do armazém, escolhida pelos artigos de maior valor, sem parar a operação.',
];

export function responderSimulado({ tarefa, prompt }: Pedido): unknown {
  const corrigir = prompt.includes('REJEITADA');
  const tituloCurso = prompt.match(/- Título do curso: (.+)/)?.[1]?.trim() ?? 'o curso';
  if (tarefa === 'pesquisar_fontes') {
    // Como a função do ZabaEdu actualizada: marcada como feita com pesquisa.
    return {
      internet: true,
      resultado: {
        fontes: [
          { titulo: 'Guia de inventário (exemplo)', url: 'https://armazem.example.org/inventario', texto: PARAGRAFOS.slice(0, 3).join('\n\n') },
          { titulo: 'Recepção e arrumação (exemplo)', url: 'https://logistica.example.org/recepcao', texto: PARAGRAFOS.slice(3).join('\n\n') },
          // Um link que não abre: tem de ser recusado.
          { titulo: 'Página inventada (exemplo)', url: 'https://armazem.example.org/nao-existe', texto: PARAGRAFOS.join(' ') },
        ],
      },
    };
  }
  if (tarefa === 'escrever_fonte') {
    const corpo = [`# ${tituloCurso}: o essencial`, ...PARAGRAFOS, '# Erros comuns', ...PARAGRAFOS.slice(0, 3)].join('\n\n');
    return { titulo: `Texto-base: ${tituloCurso}`, texto: `${corpo}\n\n${corpo}` };
  }
  if (tarefa === 'sugerir_tema') {
    const ps = passagensDoPrompt(prompt, /^\[(F\d+\.\d+)\] (.+)$/gmu);
    if (!ps.length) return {};
    const titulo = tituloCurso;
    const assuntos = ps
      .slice(0, 3)
      .map((p) => frase(p.texto).replace(/[.!?…]$/, '').split(/\s+/).slice(0, 6).join(' ').toLowerCase())
      .join('; ');
    const tema = `Para cumprir «${titulo}», o curso trata, por esta ordem: ${assuntos}.`.slice(0, 560);
    // 1.ª tentativa com um número que não está nas fontes, para o ciclo o apanhar.
    return { tema: corrigir ? tema : `${tema} Em 1987 o método foi adoptado por 4 321 empresas.` };
  }
  if (tarefa === 'planear') {
    const ps = passagensDoPrompt(prompt, /^\[(F\d+\.\d+)\] (.+)$/gmu);
    if (!ps.length) return {};
    const tema = prompt.match(/- Título do curso \(fixo[^:]*: (.+)/)?.[1]?.trim() ?? 'Curso';
    const porModulo = Math.max(2, Math.ceil(ps.length / 3));
    const modulos: unknown[] = [];
    for (let i = 0; i < ps.length && modulos.length < 3; i += porModulo) {
      const grupo = ps.slice(i, i + porModulo);
      const meio = Math.ceil(grupo.length / 2);
      const aulas = [grupo.slice(0, meio), grupo.slice(meio)]
        .filter((g) => g.length)
        .map((g, k) => ({
          titulo: frase(g[0]!.texto)
            .replace(/[.!?…]$/, '')
            .split(/\s+/)
            .slice(0, 7)
            .join(' '),
          objectivo: `Compreender: ${frase(g[0]!.texto)}`.slice(0, 380),
          minutos: 20 + 10 * k,
          passagens: corrigir ? g.map((p) => p.id) : [...g.map((p) => p.id), 'F9.99'],
        }));
      modulos.push({ titulo: `Parte ${modulos.length + 1}: ${aulas[0]!.titulo}`.slice(0, 150), resumo: frase(grupo[0]!.texto), aulas });
    }
    const resultados = ps.slice(0, 4).map((p) => ({ texto: frase(p.texto).slice(0, 290), fontes: [p.id] }));
    if (!corrigir)
      resultados.push({ texto: 'Aumentar a produtividade em 75% com inteligência artificial generativa.', fontes: [ps[0]!.id] });
    // 1.ª tentativa com outro título, para provar que o do pedido prevalece.
    return { titulo: corrigir ? tema : `${tema}: edição alargada`, subtitulo: 'Curso de exemplo gerado pelo motor simulado', prerequisitos: [], resultados, modulos };
  }

  const ps = passagensDoPrompt(prompt, /^\[(F\d+\.\d+)\] ([\s\S]+?)(?=\n\n\[F|\n\nA TUA|$(?![\s\S]))/gmu);
  if (!ps.length) return {};
  const blocos: unknown[] = ps.slice(0, 5).map((p, i) => {
    const f = frase(p.texto);
    if (i === 1 && ps.length > 2)
      return { tipo: 'citacao', citacao: f.replace(/[.!?…]$/, ''), texto: `Esta passagem resume o essencial: ${f}`, fontes: [p.id] };
    return { tipo: 'explicacao', texto: p.texto.slice(0, 600), fontes: [p.id] };
  });
  if (!corrigir) {
    blocos.push({ tipo: 'explicacao', texto: 'Em 1987 foram registados 4 321 casos semelhantes em todo o país.', fontes: [ps[0]!.id] });
    blocos.push({
      tipo: 'citacao',
      citacao: 'uma frase que não está em lado nenhum das fontes',
      texto: 'Citação adulterada.',
      fontes: [ps[0]!.id],
    });
  }
  const p0 = ps[0]!;
  const certa = frase(p0.texto).slice(0, 230);
  const perguntas = [
    {
      enunciado: 'Qual das afirmações corresponde ao que as fontes dizem?',
      opcoes: [
        certa,
        'Nenhuma das fontes trata este assunto.',
        'O assunto só se aplica fora de Moçambique.',
        'As fontes contradizem-se neste ponto.',
      ],
      correcta: 0,
      justificacao: certa,
      fontes: [p0.id],
    },
  ];
  return { blocos, perguntas };
}
