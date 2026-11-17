import type { Rascunho } from '@/lib/cursos/estaticos';

/**
 * «IA para Transporte e Logística em Moçambique» — do zero ao avançado,
 * aprender fazendo (D-49).
 *
 * Cada bloco, pergunta, gráfico e exercício cita as passagens de `fontes.ts`
 * que o sustentam e passa pelo verificador de `lib/cursos/verificar.ts`
 * (`curso.test.ts` exige zero falhas). Os dados de treino dos exercícios são
 * inventados para praticar e dizem-no; os dados reais vêm das fontes.
 */

export const RASCUNHO: Rascunho = {
  slug: 'ia-transporte-logistica-mocambique',
  titulo: 'IA para Transporte e Logística em Moçambique',
  subtitulo:
    'Do zero ao avançado, a fazer: prever a procura, optimizar rotas, cortar tempo parado e carga vazia, e levar um piloto até ao fim — com dados reais dos corredores moçambicanos.',
  publico:
    'Quem trabalha ou quer trabalhar em transporte, portos, armazéns, frotas e despachos em Moçambique. Não é preciso saber programar.',
  nivel: 'progressivo',
  prerequisitos: ['Saber fazer contas simples numa folha de cálculo ou à mão.'],
  emitidoEm: '2026-11-17T12:00:00.000Z',
  rondas: 2,
  nota: 'Escrito pela AGORAMOZ com apoio de IA e verificado automaticamente, afirmação a afirmação, contra 9 fontes públicas.',
  resultados: [
    {
      texto: 'Explicar o que é um sistema de IA: infere, a partir dos dados de entrada, como gerar previsões, recomendações ou decisões.',
      fontes: ['F1.1'],
    },
    {
      texto: 'Usar os volumes reais do Porto de Maputo e dos corredores de Maputo e da Beira.',
      fontes: ['F5.1', 'F7.2'],
    },
    {
      texto: 'Prever volumes com os métodos ingénuo, da média e da tendência e comparar o erro absoluto médio (MAE).',
      fontes: ['F8.2', 'F8.3', 'F8.4', 'F8.5'],
    },
    {
      texto: 'Optimizar rotas de vários veículos minimizando a rota mais longa, com restrições de capacidade e janelas horárias.',
      fontes: ['F9.3', 'F9.4'],
    },
    {
      texto: 'Reduzir tempos de permanência e capacidade vazia com previsão da procura e consolidação de cargas.',
      fontes: ['F3.1', 'F3.10'],
    },
    {
      texto: 'Planear experiências de IA em pequena escala, controladas e de baixo risco, com resultados claros e mensuráveis.',
      fontes: ['F2.3', 'F2.5'],
    },
  ],
  modulos: [
    /* ------------------------------------------------------------ módulo 1 */
    {
      titulo: 'Fundamentos: o que é IA e para quê',
      resumo:
        'Do zero: o que é um sistema de IA, segundo a definição usada pela OCDE, e porque se começa pelo resultado que se quer melhorar — não pela tecnologia.',
      aulas: [
        {
          titulo: 'O que é um sistema de IA',
          objectivo: 'Reconhecer um sistema de IA pelo que faz: recebe dados de entrada e infere previsões, recomendações ou decisões.',
          minutos: 25,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Um sistema de IA é um sistema baseado em máquinas que, para objectivos explícitos ou implícitos, infere, a partir dos dados de entrada que recebe, como gerar resultados: previsões, conteúdos, recomendações ou decisões. Esses resultados podem influenciar ambientes físicos (um camião, uma grua) ou virtuais (um sistema de reservas).',
              fontes: ['F1.1'],
            },
            {
              tipo: 'esquema',
              texto: 'Como funciona um sistema de IA: dados de entrada, inferência, resultados, ambiente.',
              itens: [
                'Dados de entrada que recebe',
                'Infere como gerar resultados',
                'Previsões, recomendações ou decisões',
                'Influenciam ambientes físicos ou virtuais',
              ],
              fontes: ['F1.1'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Esta definição da OCDE não é académica: a União Europeia, o Conselho da Europa, os Estados Unidos, as Nações Unidas e outras jurisdições usam-na nos seus quadros legislativos e regulamentares.',
              fontes: ['F1.2'],
            },
            {
              tipo: 'passos',
              texto: 'Os princípios baseados em valores da OCDE para a IA:',
              itens: [
                'Crescimento inclusivo, desenvolvimento sustentável e bem-estar',
                'Direitos humanos e valores democráticos, incluindo equidade e privacidade',
                'Transparência e explicabilidade',
                'Robustez, segurança e protecção',
                'Responsabilização',
              ],
              fontes: ['F1.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'No transporte, ao permitir a automação e a análise avançada de dados, espera-se que a IA faça os sistemas existentes executar tarefas de forma mais eficiente e ofereça serviços mais personalizados.',
              fontes: ['F2.1'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Segundo a definição da OCDE, o que faz um sistema de IA?',
              opcoes: [
                'Infere, a partir dos dados de entrada, como gerar previsões, conteúdos, recomendações ou decisões',
                'Substitui sempre as pessoas em todas as decisões',
                'Funciona sem dados de entrada',
                'Só existe dentro de robôs físicos',
              ],
              correcta: 0,
              justificacao:
                'Um sistema de IA infere, a partir dos dados de entrada que recebe, como gerar resultados como previsões, conteúdos, recomendações ou decisões.',
              fontes: ['F1.1'],
            },
            {
              enunciado: 'Qual destes é um dos princípios baseados em valores da OCDE para a IA?',
              opcoes: ['Transparência e explicabilidade', 'Velocidade acima de tudo', 'Lucro imediato', 'Segredo dos algoritmos'],
              correcta: 0,
              justificacao:
                'Os princípios baseados em valores incluem transparência e explicabilidade, robustez, segurança e responsabilização.',
              fontes: ['F1.3'],
            },
          ],
          exercicio: {
            titulo: 'Mapa de resultados no seu trabalho',
            contexto:
              'Pense num dia de trabalho num armazém, num porto ou numa frota. Vai separar o que lá acontece pelo tipo de resultado que um sistema de IA poderia gerar.',
            passos: [
              'Escreva seis tarefas do seu dia (por exemplo: decidir que camião sai primeiro, estimar a carga da próxima semana, responder a um cliente).',
              'Para cada tarefa, marque o tipo de resultado: previsão, recomendação, decisão ou conteúdo.',
              'Marque também se o resultado influencia um ambiente físico (veículo, carga) ou virtual (sistema, documento).',
              'Escolha a tarefa em que um erro custaria menos: é a melhor candidata para experimentar primeiro.',
            ],
            entregavel: 'Uma tabela com seis tarefas, o tipo de resultado, o ambiente e a tarefa escolhida.',
            solucao:
              'Exemplo de resposta: «estimar a carga da próxima semana» é uma previsão (ambiente virtual: o plano); «sugerir a ordem de carregamento» é uma recomendação (físico: o cais); «aprovar um crédito a um cliente» é uma decisão com risco alto — não é a primeira a experimentar.',
            fontes: ['F1.1'],
          },
        },
        {
          titulo: 'Começar pelo resultado, não pela tecnologia',
          objectivo: 'Definir um caso de uso pelo resultado que melhora, com dados, custos, riscos e supervisão humana.',
          minutos: 30,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'As primeiras implementações de IA tendem a ser orientadas para a solução — centradas no «como» — em vez de orientadas para o resultado — centradas no «para quê». Isto pode levar a implementar a IA de forma desalinhada com a missão principal.',
              fontes: ['F2.2'],
            },
            {
              tipo: 'citacao',
              citacao: 'mudar o foco de «o que pode a IA fazer?» para «que resultado pode a IA melhorar?»',
              texto: 'Cada implementação de IA deve ser acompanhada de uma avaliação de como melhora comprovadamente os resultados.',
              fontes: ['F2.6'],
            },
            {
              tipo: 'passos',
              texto: 'Antes de decidir usar IA, considere vários factores:',
              itens: [
                'Provas da eficácia do sistema de IA para o uso pretendido',
                'Disponibilidade e qualidade dos dados com que o sistema é treinado',
                'Capacidade interna para adoptar IA: governação e pessoal',
                'Custos directos e indirectos de usar IA, ou de não usar',
                'Avaliação de riscos rigorosa',
              ],
              fontes: ['F2.4'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Supervisão humana: rever e adaptar os mecanismos de governação centrados nas pessoas ao uso de IA. Sinal de alerta: usar IA porque é nova ou está disponível, e não porque serve um objectivo claro — a mentalidade de «tecnologia primeiro».',
              fontes: ['F2.7'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Qual é o sinal de alerta da mentalidade de «tecnologia primeiro»?',
              opcoes: [
                'Usar IA porque é nova ou está disponível, e não porque serve um objectivo claro',
                'Medir os resultados antes e depois',
                'Avaliar os riscos antes de começar',
                'Envolver as pessoas que fazem o trabalho',
              ],
              correcta: 0,
              justificacao:
                'A mentalidade de «tecnologia primeiro» é usar IA porque é nova ou está disponível, e não porque serve um objectivo claro.',
              fontes: ['F2.7'],
            },
            {
              enunciado: 'Qual destes factores deve ser considerado antes de decidir usar IA?',
              opcoes: [
                'A disponibilidade e a qualidade dos dados com que o sistema é treinado',
                'A cor do painel de controlo',
                'O número de fornecedores que existem no mundo',
                'Se a tecnologia é a mais recente do mercado',
              ],
              correcta: 0,
              justificacao:
                'Antes de decidir usar IA, devem considerar-se a disponibilidade e a qualidade dos dados com que o sistema de IA é treinado, entre outros factores.',
              fontes: ['F2.4'],
            },
          ],
          exercicio: {
            titulo: 'A ficha do caso de uso',
            contexto:
              'Pegue na tarefa que escolheu na aula anterior e escreva a ficha que qualquer responsável deve pedir antes de aprovar um projecto de IA.',
            passos: [
              'Resultado a melhorar: escreva-o numa frase, com a medida (por exemplo, horas de espera por camião).',
              'Provas: que evidência existe de que este tipo de sistema funciona para este uso?',
              'Dados: que dados existem hoje, onde estão, com que qualidade?',
              'Capacidade e custos: quem vai operar e supervisionar, e quanto custa fazer — e não fazer?',
              'Riscos: o que pode correr mal, e quem decide quando o sistema erra?',
            ],
            entregavel: 'Uma ficha de uma página com as cinco respostas.',
            solucao:
              'Uma boa ficha começa pelo resultado medido («reduzir as horas de espera no cais»), não pela ferramenta («comprar um sistema de IA»), e nomeia a pessoa que supervisiona e pode parar o sistema.',
            fontes: ['F2.4', 'F2.6'],
          },
        },
      ],
    },

    /* ------------------------------------------------------------ módulo 2 */
    {
      titulo: 'O terreno: corredores e portos em números',
      resumo:
        'Os dados reais de Moçambique: os três corredores, o Porto de Maputo, os camiões por dia — e como verificar um número antes de o dar a um modelo.',
      aulas: [
        {
          titulo: 'Corredores de Maputo, Beira e Nacala',
          objectivo: 'Conhecer os corredores, quem gere a rede e quantos camiões passam por dia.',
          minutos: 30,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Moçambique está situado ao longo de três corredores regionais de trânsito essenciais: Nacala, Beira e Maputo. 70% da carga movimentada nos portos moçambicanos está em trânsito para países da SADC.',
              fontes: ['F7.1'],
            },
            {
              tipo: 'grafico',
              texto:
                'Os corredores servem o comércio com os países sem litoral: no Corredor de Maputo passam 2 000 camiões por dia; no Corredor da Beira, 1 800 camiões por dia.',
              grafico: {
                titulo: 'Camiões por dia nos corredores',
                unidade: 'camiões por dia',
                series: [
                  { rotulo: 'Corredor de Maputo', valor: 2000 },
                  { rotulo: 'Corredor da Beira', valor: 1800 },
                ],
              },
              fontes: ['F7.2'],
            },
            {
              tipo: 'explicacao',
              texto:
                'A rede ferroviária tem cerca de 2 500 km e divide-se em três sistemas: Sul, Centro e Norte. O sistema Norte faz parte do Corredor Logístico de Nacala, um corredor multimodal de 1 600 km que liga o Porto de Nacala a Moatize, na província de Tete, atravessando o Malawi até ao leste da Zâmbia.',
              fontes: ['F6.4'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Na última década, cerca de 6,2 mil milhões de dólares em investimentos transformaram as infraestruturas de transporte do corredor de Nacala.',
              fontes: ['F6.1'],
            },
            {
              tipo: 'passos',
              texto: 'Quem é quem na rede de transportes:',
              itens: [
                'MTL — Ministério dos Transportes e Logística: política e regulação dos transportes',
                'ANE — Administração Nacional de Estradas: gere a rede de estradas',
                'FE — Fundo de Estradas: recursos para a manutenção',
                'CFM — Portos e Caminhos de Ferro de Moçambique: sistemas ferroviário e portuário',
                'INATRO — Instituto Nacional dos Transportes Rodoviários: segurança rodoviária e gestão do trânsito',
              ],
              fontes: ['F6.3'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Que parte da carga movimentada nos portos moçambicanos está em trânsito para países da SADC?',
              opcoes: ['70%', '7%', '17%', '100%'],
              correcta: 0,
              justificacao: '70% da carga movimentada nos portos moçambicanos está em trânsito para países da SADC.',
              fontes: ['F7.1'],
            },
            {
              enunciado: 'Quantos sistemas tem a rede ferroviária de Moçambique?',
              opcoes: ['Três: Sul, Centro e Norte', 'Um único sistema nacional', 'Dois: Norte e Sul', 'Cinco, um por província costeira'],
              correcta: 0,
              justificacao: 'A rede ferroviária divide-se em três grandes sistemas: Sul, Centro e Norte.',
              fontes: ['F6.4'],
            },
          ],
          exercicio: {
            titulo: 'Camiões por hora num corredor',
            contexto:
              'Vai converter os camiões por dia dos corredores em camiões por hora — a escala com que se planeia um posto de fronteira que funciona 24 horas.',
            dados: {
              origem: 'fontes',
              nota: 'Apresentação de Moçambique sobre os corredores (F7.2).',
              colunas: ['Corredor', 'Camiões por dia'],
              linhas: [
                ['Maputo', '2 000'],
                ['Beira', '1 800'],
              ],
            },
            passos: [
              'Some os camiões por dia dos dois corredores.',
              'Divida os camiões por dia de cada corredor por 24 horas.',
              'Compare: que corredor exige mais capacidade por hora num posto de fronteira?',
            ],
            contas: ['2 000 + 1 800 = 3 800', '2 000 / 24 = 83,3', '1 800 / 24 = 75'],
            entregavel: 'Uma tabela com o total por dia e os camiões por hora em cada corredor.',
            solucao:
              'Juntos, 3 800 camiões por dia. Em média, cerca de 83,3 camiões por hora no Corredor de Maputo e 75 no da Beira — se o tráfego fosse uniforme ao longo das 24 horas, o que raramente acontece: os picos pedem mais capacidade.',
            fontes: ['F7.2', 'F7.4'],
          },
        },
        {
          titulo: 'Porto de Maputo: ler e verificar os números',
          objectivo:
            'Calcular variações a partir dos volumes publicados e detectar números que não batem certo antes de os usar num modelo.',
          minutos: 35,
          blocos: [
            {
              tipo: 'grafico',
              texto:
                'Em 2025, o Porto de Maputo registou um máximo histórico: 32,0 milhões de toneladas movimentadas, contra 30,9 milhões no ano anterior.',
              grafico: {
                titulo: 'Volume total do Porto de Maputo',
                unidade: 'milhões de toneladas',
                series: [
                  { rotulo: '2024', valor: 30.9 },
                  { rotulo: '2025', valor: 32 },
                ],
              },
              fontes: ['F5.1', 'F5.3'],
            },
            {
              tipo: 'grafico',
              texto: 'Os volumes ferroviários passaram de 9,7 milhões de toneladas em 2024 para 11,7 milhões de toneladas em 2025.',
              grafico: {
                titulo: 'Volumes ferroviários do Porto de Maputo',
                unidade: 'milhões de toneladas',
                series: [
                  { rotulo: '2024', valor: 9.7 },
                  { rotulo: '2025', valor: 11.7 },
                ],
              },
              fontes: ['F5.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'As operações directas da MPDC também atingiram um nível recorde, com 15,2 milhões de toneladas movimentadas, um crescimento de 6,4% face ao ano anterior.',
              fontes: ['F5.2'],
            },
            {
              tipo: 'explicacao',
              texto:
                'O porto continua a investir para aumentar a capacidade: a expansão do terminal de granéis para 16 milhões de toneladas e a expansão do terminal de contentores da DP World, com intervenções coordenadas em nós-chave do corredor logístico.',
              fontes: ['F5.4'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Quantas toneladas movimentou o Porto de Maputo em 2025?',
              opcoes: ['32,0 milhões de toneladas', '15,2 milhões de toneladas', '11,7 milhões de toneladas', '9,7 milhões de toneladas'],
              correcta: 0,
              justificacao: 'Em 2025, o Porto de Maputo movimentou um total de 32,0 milhões de toneladas, um máximo histórico.',
              fontes: ['F5.1'],
            },
            {
              enunciado: 'Quanto movimentaram as operações directas da MPDC?',
              opcoes: ['15,2 milhões de toneladas', '32,0 milhões de toneladas', '30,9 milhões de toneladas', '16 milhões de toneladas'],
              correcta: 0,
              justificacao: 'As operações directas da MPDC atingiram um recorde, com 15,2 milhões de toneladas movimentadas.',
              fontes: ['F5.2'],
            },
          ],
          exercicio: {
            titulo: 'Confira a conta da fonte',
            contexto:
              'Antes de dar dados a um modelo de IA, confirma-se que batem certo. O comunicado diz que o total cresceu 3,4% e que o ferroviário cresceu 17%. Refaça as contas com os volumes publicados.',
            dados: {
              origem: 'fontes',
              nota: 'Comunicado da MPDC sobre 2025 (F5.1 e F5.3).',
              colunas: ['Volume', '2024', '2025'],
              linhas: [
                ['Total do porto (milhões de t)', '30,9', '32,0'],
                ['Ferroviário (milhões de t)', '9,7', '11,7'],
              ],
            },
            passos: [
              'Calcule a variação do total e a percentagem de crescimento.',
              'Faça o mesmo para o ferroviário.',
              'Compare com as percentagens publicadas e decida: a diferença explica-se por arredondamento?',
              'Calcule a quota do ferroviário no total de 2025.',
            ],
            contas: [
              '32,0 - 30,9 = 1,1',
              '1,1 / 30,9 × 100 = 3,6',
              '11,7 - 9,7 = 2,0',
              '2,0 / 9,7 × 100 = 20,6',
              '11,7 / 32,0 × 100 = 36,6',
            ],
            entregavel: 'Uma nota de três linhas: o que confere, o que não confere e o que perguntaria à fonte.',
            solucao:
              'Total: mais 1,1 milhões de t, cerca de 3,6% — a fonte diz 3,4%, diferença que cabe no arredondamento dos volumes publicados com uma casa decimal. Ferroviário: mais 2,0 milhões de t, cerca de 20,6% — a fonte diz 17%, e com uma casa decimal o arredondamento não chega para explicar a diferença: anote-a e pergunte à fonte antes de usar o número. Quota ferroviária em 2025: cerca de 36,6%.',
            fontes: ['F5.1', 'F5.3'],
          },
        },
        {
          titulo: 'Onde se perde tempo e dinheiro',
          objectivo: 'Identificar os pontos de atraso e custo — fronteiras, portos, retornos vazios — onde a IA pode ter impacto.',
          minutos: 30,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Em média, passam 44 dias desde que um contentor entra no porto do país exportador até sair do porto de destino, com um desvio-padrão de 10,5 dias. Esse período representa 60 por cento do tempo que leva a comercializar mercadorias a nível internacional.',
              fontes: ['F4.2'],
            },
            {
              tipo: 'citacao',
              citacao: 'os maiores atrasos acontecem nos portos marítimos, nos aeroportos e nas instalações multimodais',
              texto: 'É nas instalações — portos e plataformas multimodais — que as políticas podem ajudar a melhorar a fiabilidade.',
              fontes: ['F4.4'],
            },
            {
              tipo: 'explicacao',
              texto:
                'No Corredor de Nacala, os custos de transporte por quilómetro são elevados, estimados em 2,42 dólares por km. Há atrasos e variabilidade do tempo nas fronteiras, estações de pesagem que muitas vezes não funcionam, e no sector ferroviário os vagões regressam vazios.',
              fontes: ['F6.2'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Os postos fronteiriços tinham atrasos e ineficiências: infraestruturas desactualizadas, procedimentos fragmentados e má coordenação entre agências de fronteira, com tempos de desalfandegamento longos e mais custos para os comerciantes.',
              fontes: ['F7.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Fora do carvão, a procura ferroviária é limitada e cara, porque há pouca carga de retorno; produtores e comerciantes enfrentam alguns dos custos logísticos mais altos da região.',
              fontes: ['F6.6'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Em média, quantos dias passam entre a entrada de um contentor no porto exportador e a saída do porto de destino?',
              opcoes: ['44 dias', '10,5 dias', '60 dias', '139 dias'],
              correcta: 0,
              justificacao:
                'Em média, passam 44 dias desde que um contentor entra no porto do país exportador até sair do porto de destino.',
              fontes: ['F4.2'],
            },
            {
              enunciado: 'Porque é que a procura ferroviária fora do carvão é cara no Norte?',
              opcoes: [
                'Porque há pouca carga de retorno',
                'Porque não existe linha férrea',
                'Porque o carvão é proibido',
                'Porque os comboios são novos',
              ],
              correcta: 0,
              justificacao: 'Fora do carvão, a procura ferroviária é limitada e cara, porque há pouca carga de retorno.',
              fontes: ['F6.6'],
            },
          ],
          exercicio: {
            titulo: 'Quanto tempo leva o comércio de ponta a ponta',
            contexto:
              'Se 44 dias são 60 por cento do tempo total do comércio internacional, quanto tempo leva a operação inteira — e quanto fica fora do trajecto porto a porto?',
            passos: [
              'Converta 60 por cento numa fracção.',
              'Divida os 44 dias por essa fracção para obter o tempo total.',
              'Subtraia os 44 dias ao total.',
            ],
            contas: ['60 / 100 = 0,6', '44 / 0,6 = 73,3', '73,3 - 44 = 29,3'],
            entregavel: 'O tempo total estimado e os dias fora do trajecto porto a porto, com uma frase sobre onde actuaria primeiro.',
            solucao:
              'Cerca de 73,3 dias no total, dos quais cerca de 29,3 fora do trajecto porto a porto. Os maiores atrasos acontecem nos portos e instalações multimodais: é aí que a previsão e a programação valem mais.',
            fontes: ['F4.2'],
          },
        },
      ],
    },

    /* ------------------------------------------------------------ módulo 3 */
    {
      titulo: 'Prever a procura: o primeiro modelo',
      resumo:
        'O primeiro modelo de previsão faz-se à mão: métodos ingénuo, da média e da tendência, e o erro absoluto médio para escolher entre eles.',
      aulas: [
        {
          titulo: 'Métodos simples de previsão',
          objectivo: 'Aplicar os métodos ingénuo e da tendência a volumes reais e perceber porque servem de referência.',
          minutos: 35,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Quatro métodos simples de previsão servem de referência. Por vezes, um destes métodos simples será o melhor método disponível; em muitos casos, servirão de referência em vez de serem o método escolhido.',
              fontes: ['F8.1'],
            },
            {
              tipo: 'passos',
              texto: 'Os métodos de referência:',
              itens: [
                'Método da média: as previsões são iguais à média dos dados históricos',
                'Método ingénuo: todas as previsões iguais ao valor da última observação',
                'Método da tendência: a variação ao longo do tempo é igual à variação média observada nos dados históricos',
              ],
              fontes: ['F8.2', 'F8.3', 'F8.4'],
            },
            {
              tipo: 'esquema',
              texto: 'O ciclo de uma previsão: dados históricos, método de referência, previsões, erro absoluto médio.',
              itens: ['Dados históricos', 'Método de referência: média, ingénuo, tendência', 'Previsões', 'Erro absoluto médio (MAE)'],
              fontes: ['F8.1', 'F8.2', 'F8.5'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Na logística, as soluções com IA ajudam a prever a procura, optimizar as práticas de carregamento e gerar cenários de procura de capacidade. Uma boa previsão de referência é o ponto de partida para medir se um modelo mais sofisticado melhora alguma coisa.',
              fontes: ['F3.10', 'F8.1'],
            },
          ],
          perguntas: [
            {
              enunciado: 'No método ingénuo, qual é a previsão?',
              opcoes: [
                'O valor da última observação',
                'A média de todos os dados históricos',
                'O maior valor alguma vez observado',
                'Zero, até haver mais dados',
              ],
              correcta: 0,
              justificacao: 'Nas previsões ingénuas, basta fazer todas as previsões iguais ao valor da última observação.',
              fontes: ['F8.3'],
            },
            {
              enunciado: 'Para que servem, em muitos casos, os métodos simples de previsão?',
              opcoes: [
                'Servem de referência',
                'Substituem qualquer outro método',
                'Só servem para dados financeiros',
                'Não servem para nada',
              ],
              correcta: 0,
              justificacao: 'Em muitos casos, os métodos simples servirão de referência em vez de serem o método escolhido.',
              fontes: ['F8.1'],
            },
          ],
          exercicio: {
            titulo: 'Prever 2026 no Porto de Maputo',
            contexto: 'Com os volumes publicados, faça as previsões ingénua e da tendência para 2026, para o total e para o ferroviário.',
            dados: {
              origem: 'fontes',
              nota: 'Volumes publicados pela MPDC (F5.1 e F5.3).',
              colunas: ['Volume', '2024', '2025'],
              linhas: [
                ['Total (milhões de t)', '30,9', '32,0'],
                ['Ferroviário (milhões de t)', '9,7', '11,7'],
              ],
            },
            passos: [
              'Previsão ingénua: repita o último valor observado.',
              'Tendência: calcule a variação média (com dois anos, é a única variação) e some-a ao último valor.',
              'Escreva um aviso: com apenas dois anos de dados, quão fiável é a tendência?',
            ],
            contas: ['32,0 - 30,9 = 1,1', '32,0 + 1,1 = 33,1', '11,7 - 9,7 = 2,0', '11,7 + 2,0 = 13,7'],
            entregavel: 'Uma tabela com as previsões ingénua e da tendência para 2026 e o aviso sobre os dados.',
            solucao:
              'Total: ingénua 32,0; tendência 33,1 milhões de t. Ferroviário: ingénua 11,7; tendência 13,7 milhões de t. Com dois anos apenas, a tendência é frágil: são previsões de referência para comparar, não promessas.',
            fontes: ['F5.1', 'F5.3', 'F8.3', 'F8.4'],
          },
        },
        {
          titulo: 'Medir o erro e escolher o método',
          objectivo: 'Calcular o erro absoluto médio (MAE) de dois métodos num período de teste e escolher o melhor.',
          minutos: 40,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'O erro absoluto médio (MAE) é a média dos erros absolutos. Ao comparar métodos de previsão aplicados a uma série temporal, ou a várias séries com as mesmas unidades, o MAE é popular porque é fácil de perceber e de calcular.',
              fontes: ['F8.5'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Um método que minimiza o MAE leva a previsões da mediana; minimizar o RMSE, que se baseia nos erros ao quadrado, leva a previsões da média.',
              fontes: ['F8.5'],
            },
            {
              tipo: 'exemplo',
              texto:
                'Exemplo real de previsão com IA: a divisão de carga de uma grande companhia aérea previu a capacidade de carga reservada ao longo do tempo, tendo em conta mudanças de peso, cancelamentos e novas reservas, e aumentou o factor de carga em 8% num programa-piloto de 12 semanas.',
              fontes: ['F3.12'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Porque é que o MAE é popular para comparar métodos de previsão?',
              opcoes: [
                'Porque é fácil de perceber e de calcular',
                'Porque elimina todos os erros',
                'Porque só funciona com dados financeiros',
                'Porque dispensa um período de teste',
              ],
              correcta: 0,
              justificacao:
                'Ao comparar métodos de previsão com as mesmas unidades, o MAE é popular porque é fácil de perceber e de calcular.',
              fontes: ['F8.5'],
            },
            {
              enunciado: 'No piloto da companhia aérea, quanto aumentou o factor de carga?',
              opcoes: ['8%', '12%', '50%', '70%'],
              correcta: 0,
              justificacao: 'A abordagem levou a um aumento de 8% no factor de carga durante um programa-piloto de 12 semanas.',
              fontes: ['F3.12'],
            },
          ],
          exercicio: {
            titulo: 'Ingénuo contra média num porto seco',
            contexto:
              'Um porto seco regista os contentores movimentados por semana. Use as semanas 1 a 4 para construir as previsões e as semanas 5 e 6 para testar.',
            dados: {
              origem: 'treino',
              nota: 'Dados de treino, inventados para praticar.',
              colunas: ['Semana', 'Contentores'],
              linhas: [
                ['1', '120'],
                ['2', '132'],
                ['3', '128'],
                ['4', '140'],
                ['5', '136'],
                ['6', '150'],
              ],
            },
            passos: [
              'Método ingénuo: a previsão para as semanas 5 e 6 é o valor da semana 4.',
              'Método da média: a previsão é a média das semanas 1 a 4.',
              'Calcule os erros absolutos de cada método nas semanas 5 e 6.',
              'Calcule o MAE de cada método e escolha o menor.',
            ],
            contas: [
              '120 + 132 + 128 + 140 = 520',
              '520 / 4 = 130',
              '140 - 136 = 4',
              '150 - 140 = 10',
              '(4 + 10) / 2 = 7',
              '136 - 130 = 6',
              '150 - 130 = 20',
              '(6 + 20) / 2 = 13',
            ],
            entregavel: 'Uma tabela com previsões, erros e o MAE de cada método, e a escolha justificada.',
            solucao:
              'Ingénuo: previsão 140, MAE 7. Média: previsão 130, MAE 13. Nesta série, que cresce, o método ingénuo erra menos e é a referência a bater.',
            fontes: ['F8.2', 'F8.3', 'F8.5'],
          },
        },
      ],
    },

    /* ------------------------------------------------------------ módulo 4 */
    {
      titulo: 'Optimizar operações: rotas, tempo parado, carga vazia',
      resumo:
        'As três alavancas operacionais com mais provas: optimizar rotas, reduzir o tempo de permanência e a capacidade vazia, e manutenção preditiva.',
      aulas: [
        {
          titulo: 'Rotas: o problema dos veículos',
          objectivo: 'Formular um problema de roteamento de veículos e comparar planos pela rota mais longa.',
          minutos: 40,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'A optimização de rotas é o planeamento e a gestão estratégica das rotas para aumentar a eficiência das operações logísticas. Percursos ineficientes traduzem-se em mais consumo de combustível, mais desgaste dos veículos e maiores custos de mão-de-obra.',
              fontes: ['F3.4'],
            },
            {
              tipo: 'explicacao',
              texto:
                'No problema de roteamento de veículos (VRP), o objectivo é encontrar rotas óptimas para vários veículos que visitam um conjunto de locais. Sem outras restrições, a menor distância total leva a atribuir um único veículo a todos os locais — o problema do caixeiro-viajante.',
              fontes: ['F9.1', 'F9.2'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Uma melhor definição de rotas óptimas é minimizar o comprimento da rota mais longa entre todos os veículos: é a definição certa se o objectivo é concluir todas as entregas o mais depressa possível.',
              fontes: ['F9.3'],
            },
            {
              tipo: 'esquema',
              texto: 'Do problema à rota: locais, veículos e restrições, rotas, rota mais longa mínima.',
              itens: [
                'Conjunto de locais a visitar',
                'Vários veículos com capacidade máxima',
                'Janelas horárias de cada local',
                'Minimizar a rota mais longa',
              ],
              fontes: ['F9.1', 'F9.3', 'F9.4'],
            },
            {
              tipo: 'exemplo',
              texto:
                'A Greenplan, uma start-up financiada pela DHL Express, desenvolveu uma ferramenta de optimização de rotas com IA que pode alcançar até 20% de poupança em custos de combustível, usando 70% menos tempo de computação do que as ferramentas convencionais.',
              fontes: ['F3.6'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Se o objectivo é concluir todas as entregas o mais depressa possível, o que se deve minimizar?',
              opcoes: [
                'O comprimento da rota mais longa entre todos os veículos',
                'O número de clientes visitados',
                'A distância total, mesmo que um só veículo faça tudo',
                'O número de veículos parados',
              ],
              correcta: 0,
              justificacao:
                'Minimizar o comprimento da rota mais longa entre todos os veículos é a definição certa para concluir todas as entregas o mais depressa possível.',
              fontes: ['F9.3'],
            },
            {
              enunciado: 'O que é uma janela horária no roteamento de veículos?',
              opcoes: [
                'Um intervalo de tempo específico em que cada local tem de ser visitado',
                'O horário de almoço do motorista',
                'A capacidade máxima de carga do veículo',
                'O tempo de computação da ferramenta',
              ],
              correcta: 0,
              justificacao: 'Janelas horárias: cada local tem de ser visitado dentro de um intervalo de tempo específico.',
              fontes: ['F9.4'],
            },
          ],
          exercicio: {
            titulo: 'Dois veículos, quatro clientes',
            contexto:
              'Um armazém (Z) serve quatro clientes (A, B, C e E) com dois veículos. Compare dois planos pela distância total e pela rota mais longa, e escolha conforme o objectivo.',
            dados: {
              origem: 'treino',
              nota: 'Distâncias de treino, inventadas para praticar (km).',
              colunas: ['Trajecto', 'km'],
              linhas: [
                ['Z–A', '12'],
                ['Z–B', '14'],
                ['Z–C', '9'],
                ['Z–E', '11'],
                ['A–B', '5'],
                ['C–E', '6'],
                ['A–C', '8'],
                ['B–E', '4'],
              ],
            },
            passos: [
              'Plano 1: veículo 1 faz Z–A–B–Z; veículo 2 faz Z–C–E–Z. Calcule cada rota e o total.',
              'Plano 2: veículo 1 faz Z–A–C–Z; veículo 2 faz Z–B–E–Z. Calcule cada rota e o total.',
              'Que plano tem menor distância total? Que plano tem a rota mais longa mais curta?',
              'Se o objectivo é acabar todas as entregas mais cedo, que plano escolhe?',
            ],
            contas: ['12 + 5 + 14 = 31', '9 + 6 + 11 = 26', '31 + 26 = 57', '12 + 8 + 9 = 29', '14 + 4 + 11 = 29', '29 + 29 = 58'],
            entregavel: 'Uma tabela com as rotas dos dois planos e a escolha justificada pelo objectivo.',
            solucao:
              'Plano 1: rotas de 31 e 26 km, total 57 km, rota mais longa 31 km. Plano 2: rotas de 29 e 29 km, total 58 km, rota mais longa 29 km. Pela distância total ganha o plano 1; para acabar as entregas mais cedo ganha o plano 2. O objectivo decide a resposta — é o que um optimizador de rotas precisa de saber.',
            fontes: ['F9.2', 'F9.3'],
          },
        },
        {
          titulo: 'Tempo parado e carga vazia',
          objectivo: 'Medir a percentagem de quilómetros vazios de uma frota e estimar o efeito de consolidar cargas de retorno.',
          minutos: 40,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Os tempos de permanência são os períodos em que veículos, motoristas ou mercadorias estão parados, por exemplo à espera de carga ou descarga. Tempos de permanência longos são uma fonte de consumo desnecessário de combustível e de emissões.',
              fontes: ['F3.1'],
            },
            {
              tipo: 'citacao',
              citacao: 'Usamos IA para analisar padrões de tráfego e optimizar os horários de carga e descarga no porto',
              texto:
                'Testemunho de um operador portuário citado no relatório: com IA, reduziram os tempos parados e optimizaram o uso do espaço.',
              fontes: ['F3.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'As soluções com IA podem ajudar a prever a procura, optimizar as práticas de carregamento e sugerir as melhores rotas para reduzir o espaço vazio. Ao consolidar cargas de forma dinâmica, estes sistemas podem ajudar a reduzir emissões e a melhorar a eficiência.',
              fontes: ['F3.10'],
            },
            {
              tipo: 'explicacao',
              texto:
                'A análise sugere que, no transporte rodoviário de mercadorias dos EUA, a capacidade vazia poderia ser reduzida em até 50%, evitando a emissão de 43 mil milhões de kg de CO2 por ano.',
              fontes: ['F3.11'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Em Moçambique, no sector ferroviário do Corredor de Nacala, os custos são mais altos porque os vagões regressam vazios.',
              fontes: ['F6.2'],
            },
          ],
          perguntas: [
            {
              enunciado: 'O que são tempos de permanência?',
              opcoes: [
                'Períodos em que veículos, motoristas ou mercadorias estão parados',
                'O tempo de viagem entre dois portos',
                'A duração do contrato de um motorista',
                'O prazo de validade de uma licença',
              ],
              correcta: 0,
              justificacao: 'Os tempos de permanência são os períodos em que veículos, motoristas ou mercadorias estão parados.',
              fontes: ['F3.1'],
            },
            {
              enunciado: 'Como podem as soluções com IA ajudar a reduzir o espaço vazio?',
              opcoes: [
                'Prevendo a procura, optimizando o carregamento e consolidando cargas',
                'Aumentando a velocidade dos camiões',
                'Eliminando as rotas de retorno',
                'Comprando mais veículos',
              ],
              correcta: 0,
              justificacao:
                'As soluções com IA podem ajudar a prever a procura, optimizar as práticas de carregamento e consolidar cargas de forma dinâmica para reduzir o espaço vazio.',
              fontes: ['F3.10'],
            },
          ],
          exercicio: {
            titulo: 'Quilómetros vazios de uma frota',
            contexto:
              'Uma transportadora regista, para quatro viagens, os quilómetros com carga e os quilómetros vazios (sobretudo no regresso). Meça o problema e estime o efeito de encontrar carga de retorno nas viagens 1 e 3.',
            dados: {
              origem: 'treino',
              nota: 'Dados de treino, inventados para praticar.',
              colunas: ['Viagem', 'km com carga', 'km vazios'],
              linhas: [
                ['1', '420', '410'],
                ['2', '380', '0'],
                ['3', '510', '495'],
                ['4', '300', '120'],
              ],
            },
            passos: [
              'Some os quilómetros com carga e os quilómetros vazios.',
              'Calcule a percentagem de quilómetros vazios no total.',
              'Se as viagens 1 e 3 conseguirem carga de retorno, quantos quilómetros vazios sobram?',
              'Calcule a nova percentagem de quilómetros vazios.',
            ],
            contas: [
              '420 + 380 + 510 + 300 = 1 610',
              '410 + 0 + 495 + 120 = 1 025',
              '1 610 + 1 025 = 2 635',
              '1 025 / 2 635 × 100 = 38,9',
              '410 + 495 = 905',
              '1 025 - 905 = 120',
              '120 / 2 635 × 100 = 4,6',
            ],
            entregavel: 'A percentagem de quilómetros vazios antes e depois, e que dados precisaria para prever cargas de retorno.',
            solucao:
              'Antes: 1 025 km vazios em 2 635 km, cerca de 38,9%. Com carga de retorno nas viagens 1 e 3, sobram 120 km vazios, cerca de 4,6%. Para o conseguir de forma sistemática, é preciso prever a procura de retorno — origem, destino, datas e volumes de cargas por servir.',
            fontes: ['F3.10'],
          },
        },
        {
          titulo: 'Manutenção preditiva e condução',
          objectivo: 'Estimar o valor da manutenção preditiva e saber que dados de condução a IA usa.',
          minutos: 30,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'A manutenção preditiva com IA acompanha o estado dos activos, prevê falhas e optimiza os calendários de manutenção. A IA analisa grandes quantidades de dados históricos e em tempo real para identificar padrões que as pessoas podem não ver, como o desgaste do motor, a degradação dos pneus ou o desempenho dos travões.',
              fontes: ['F3.8'],
            },
            {
              tipo: 'explicacao',
              texto:
                'No sector ferroviário, a manutenção proactiva custa cerca de sete vezes menos do que as reparações de emergência feitas depois de a infraestrutura falhar. Alguns operadores ferroviários usam plataformas de manutenção preditiva para detectar sinais precoces de desgaste em agulhas e engrenagens.',
              fontes: ['F3.9'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Os estilos de condução influenciam muito o consumo de combustível: no transporte rodoviário de mercadorias, acelerações e travagens bruscas aumentam as emissões em até 23%. A IA pode usar dados em tempo real de sensores a bordo para acompanhar a condução e o motor ligado parado, junto com o trânsito, o tempo e o estado das estradas.',
              fontes: ['F3.7'],
            },
          ],
          perguntas: [
            {
              enunciado: 'No sector ferroviário, quanto custa a manutenção proactiva face às reparações de emergência?',
              opcoes: ['Cerca de sete vezes menos', 'O mesmo', 'Cerca de sete vezes mais', 'Metade mais'],
              correcta: 0,
              justificacao:
                'No sector ferroviário, a manutenção proactiva custa cerca de sete vezes menos do que as reparações de emergência.',
              fontes: ['F3.9'],
            },
            {
              enunciado: 'Que dados usa a IA para acompanhar a condução?',
              opcoes: [
                'Dados em tempo real de sensores a bordo, com trânsito, tempo e estado das estradas',
                'Apenas a idade do motorista',
                'Só o preço do combustível',
                'O número de passageiros',
              ],
              correcta: 0,
              justificacao:
                'A IA pode usar dados em tempo real de sensores a bordo para acompanhar a condução, junto com o trânsito, o tempo e o estado das estradas.',
              fontes: ['F3.7'],
            },
          ],
          exercicio: {
            titulo: 'O valor de prever uma avaria',
            contexto:
              'Um operador ferroviário teve seis reparações de emergência em agulhas num ano. Use a razão da fonte — a manutenção proactiva custa cerca de sete vezes menos — para estimar a poupança se as tivesse previsto.',
            dados: {
              origem: 'treino',
              nota: 'Custo de treino, inventado para praticar; a razão «cerca de sete vezes menos» vem da fonte.',
              colunas: ['Item', 'Valor'],
              linhas: [['Custo de uma reparação de emergência (MT)', '70 000']],
            },
            passos: [
              'Estime o custo de uma intervenção proactiva: divida o custo de emergência por sete.',
              'Calcule o custo anual das seis emergências e das seis intervenções proactivas.',
              'Calcule a diferença e diga que dados precisaria para prever as avarias.',
            ],
            contas: ['70 000 / 7 = 10 000', '6 × 70 000 = 420 000', '6 × 10 000 = 60 000', '420 000 - 60 000 = 360 000'],
            entregavel: 'A poupança estimada e a lista dos dados de sensores que pediria.',
            solucao:
              'Cerca de 10 000 MT por intervenção proactiva; 420 000 MT em emergências contra 60 000 MT em prevenção: cerca de 360 000 MT por ano. Para prever as avarias são precisos dados históricos e em tempo real de desgaste das agulhas e engrenagens.',
            fontes: ['F3.8', 'F3.9'],
          },
        },
      ],
    },

    /* ------------------------------------------------------------ módulo 5 */
    {
      titulo: 'Avançado: fronteiras digitais, emissões e o piloto',
      resumo: 'Dados partilhados nas fronteiras, mudança modal e emissões, e como levar um piloto de IA do teste à decisão.',
      aulas: [
        {
          titulo: 'Fronteiras digitais e dados partilhados',
          objectivo: 'Desenhar os indicadores e os dados partilhados de um corredor digital.',
          minutos: 35,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Moçambique está a investir na simplificação e harmonização dos procedimentos aduaneiros: digitalização dos processos (janela única), pré-desalfandegamento online e uma via directa para camiões em trânsito no posto fronteiriço de Ressano Garcia, que funciona 24 horas.',
              fontes: ['F7.4'],
            },
            {
              tipo: 'esquema',
              texto: 'Da papelada ao risco: janela única, pré-desalfandegamento online, gestão de risco, inspecções dirigidas.',
              itens: ['Janela única', 'Pré-desalfandegamento online', 'Sistemas de gestão de risco', 'Inspecções dirigidas'],
              fontes: ['F7.4', 'F7.6'],
            },
            {
              tipo: 'passos',
              texto: 'Conquistas da facilitação do comércio:',
              itens: [
                'Integração na Janela Única',
                'Informação disponível no Portal do Comércio',
                'Certificado de origem electrónico',
                'Certificação fitossanitária electrónica',
                'Digitalização de vistos e licenças',
              ],
              fontes: ['F7.5'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Segundo o LPI 2023, a digitalização da cadeia de abastecimento de ponta a ponta, sobretudo nas economias emergentes, está a permitir reduzir os atrasos nos portos em até 70%.',
              fontes: ['F4.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'O impacto é medido com indicadores-chave de desempenho: o tempo médio de travessia da fronteira e os volumes de comércio em trânsito pelos corredores. A interoperabilidade dos sistemas informáticos entre países e as plataformas de partilha de dados são factores de sucesso.',
              fontes: ['F7.7'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Procurar oportunidades de partilha de dados entre portos, operadores de navios, donos de frotas, carregadores e clientes ajuda a optimizar a eficiência operacional, os volumes de carga e a utilização da capacidade.',
              fontes: ['F3.17'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Que indicador mede o impacto das reformas nas fronteiras?',
              opcoes: [
                'O tempo médio de travessia da fronteira',
                'O número de funcionários contratados',
                'A cor dos camiões',
                'O preço dos vistos',
              ],
              correcta: 0,
              justificacao:
                'O impacto é medido com indicadores-chave de desempenho, como o tempo médio de travessia da fronteira e os volumes em trânsito.',
              fontes: ['F7.7'],
            },
            {
              enunciado: 'Que medida introduz inspecções dirigidas na fronteira?',
              opcoes: [
                'Sistemas de gestão de risco',
                'Mais documentos em papel',
                'Inspecção a todos os camiões',
                'Fechar a fronteira à noite',
              ],
              correcta: 0,
              justificacao: 'Os postos de fronteira de paragem única introduzem sistemas de gestão de risco para inspecções dirigidas.',
              fontes: ['F7.6'],
            },
          ],
          exercicio: {
            titulo: 'O painel de um corredor',
            contexto:
              'Desenhe o painel de indicadores de um corredor moçambicano, com dados partilhados entre fronteira, porto e transportadores.',
            passos: [
              'Escolha quatro indicadores: tempo médio de travessia da fronteira, volume em trânsito, tempo de permanência no porto e percentagem de quilómetros vazios.',
              'Para cada um, diga de onde vêm os dados (janela única, terminal, frota) e quem os partilha.',
              'Defina a frequência (diária, semanal) e o responsável por cada indicador.',
              'Defina um alerta: a partir de que valor alguém tem de agir?',
            ],
            entregavel: 'Uma tabela com quatro indicadores, fonte dos dados, frequência, responsável e alerta.',
            solucao:
              'Exemplo: tempo de travessia — dados da janela única, diário, responsável da fronteira, alerta quando sobe face à média da semana; quilómetros vazios — dados da frota, semanal, responsável de operações, alerta quando passa a referência da empresa.',
            fontes: ['F7.7', 'F3.17'],
          },
        },
        {
          titulo: 'Mudança modal e emissões',
          objectivo: 'Ler os dados de mudança modal e ligá-los ao caso do ferroviário no Porto de Maputo.',
          minutos: 30,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Passar mercadorias para modos mais eficientes em carbono pode reduzir as emissões globais do transporte de mercadorias em 3 a 4%. Passar carga de camiões de longo curso para o comboio pode reduzir o consumo de combustível, para a mesma tonelagem, em até 75%.',
              fontes: ['F3.13'],
            },
            {
              tipo: 'grafico',
              texto:
                'Repartição modal depois da mudança estudada na Figura 4: ferroviário 9,3, marítimo 73,2, rodoviário 17,2 e aéreo 0,2 por cento dos volumes globais de mercadorias.',
              grafico: {
                titulo: 'Repartição modal depois da mudança (Figura 4)',
                unidade: '% dos volumes globais',
                series: [
                  { rotulo: 'Aéreo', valor: 0.2 },
                  { rotulo: 'Ferroviário', valor: 9.3 },
                  { rotulo: 'Rodoviário', valor: 17.2 },
                  { rotulo: 'Marítimo', valor: 73.2 },
                ],
              },
              fontes: ['F3.14'],
            },
            {
              tipo: 'explicacao',
              texto:
                'Os volumes ferroviários são um pilar central da estratégia de sustentabilidade do Porto de Maputo: passaram de 9,7 milhões de toneladas em 2024 para 11,7 milhões em 2025.',
              fontes: ['F5.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'A procura de logística verde está a crescer: 75 por cento dos carregadores procuram opções amigas do ambiente quando exportam para países de rendimento elevado.',
              fontes: ['F4.3'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Passar carga de camiões de longo curso para o comboio pode reduzir o consumo de combustível em até quanto?',
              opcoes: ['75%', '23%', '95%', '4%'],
              correcta: 0,
              justificacao:
                'Passar carga de camiões de longo curso para o comboio pode reduzir o consumo de combustível, para a mesma tonelagem, em até 75%.',
              fontes: ['F3.13'],
            },
            {
              enunciado:
                'Que percentagem dos carregadores procura opções amigas do ambiente ao exportar para países de rendimento elevado?',
              opcoes: ['75 por cento', '60 por cento', '44 por cento', '17 por cento'],
              correcta: 0,
              justificacao:
                '75 por cento dos carregadores procuram opções amigas do ambiente quando exportam para países de rendimento elevado.',
              fontes: ['F4.3'],
            },
          ],
          exercicio: {
            titulo: 'Ler a Figura 4 e o caso de Maputo',
            contexto: 'Confira as variações da Figura 4 e calcule a quota do ferroviário no Porto de Maputo em 2024 e em 2025.',
            dados: {
              origem: 'fontes',
              nota: 'Figura 4 do relatório do Fórum Económico Mundial (F3.14).',
              colunas: ['Modo', 'Antes (%)', 'Depois (%)'],
              linhas: [
                ['Ferroviário', '7,8', '9,3'],
                ['Rodoviário', '19,2', '17,2'],
                ['Marítimo', '72,8', '73,2'],
              ],
            },
            passos: [
              'Calcule a variação do ferroviário e do rodoviário na Figura 4 e confira com a fonte.',
              'Calcule a quota do ferroviário no total do Porto de Maputo em 2024 e em 2025.',
              'Que tendência vê, e que dados pediria para a explicar?',
            ],
            contas: ['9,3 - 7,8 = 1,5', '19,2 - 17,2 = 2,0', '9,7 / 30,9 × 100 = 31,4', '11,7 / 32,0 × 100 = 36,6'],
            entregavel: 'As variações conferidas e as duas quotas do ferroviário em Maputo, com uma frase de leitura.',
            solucao:
              'Na Figura 4, o ferroviário ganha 1,5 pontos e o rodoviário perde 2,0 — confere com a fonte. Em Maputo, a quota do ferroviário passa de cerca de 31,4% em 2024 para cerca de 36,6% em 2025: o porto está a mudar carga da estrada para o comboio.',
            fontes: ['F3.14', 'F5.1', 'F5.3'],
          },
        },
        {
          titulo: 'Do piloto à decisão',
          objectivo: 'Planear um piloto de IA pequeno, controlado e mensurável, com uma regra de decisão no fim.',
          minutos: 40,
          blocos: [
            {
              tipo: 'explicacao',
              texto:
                'Usar IA traz riscos, mas a inacção é também um risco estratégico. Não se deve esperar por condições perfeitas: fazem-se experiências em pequena escala, controladas e de baixo risco, em casos de uso bem definidos que possam ser testados com segurança, monitorizados, melhorados, ampliados ou descontinuados.',
              fontes: ['F2.3'],
            },
            {
              tipo: 'esquema',
              texto: 'O ciclo do piloto: caso de uso bem definido, testar com segurança, monitorizar, ampliar ou descontinuar.',
              itens: ['Caso de uso bem definido', 'Testado com segurança', 'Monitorizado e melhorado', 'Ampliado ou descontinuado'],
              fontes: ['F2.3'],
            },
            {
              tipo: 'explicacao',
              texto:
                'A IA deve produzir resultados claros e mensuráveis, alinhados com o fim a que se destina. A reavaliação regular permite determinar se o desempenho do sistema de IA continua satisfatório.',
              fontes: ['F2.5'],
            },
            {
              tipo: 'passos',
              texto: 'Três caminhos de adopção, do mais simples ao mais exigente:',
              itens: [
                'Integrar uma solução comercial já pronta, com pouca ou nenhuma personalização',
                'Aumentar modelos existentes com dados e conhecimento próprios',
                'Desenvolver um novo modelo de base de raiz, à medida da organização',
              ],
              fontes: ['F3.16'],
            },
            {
              tipo: 'explicacao',
              texto:
                'O sector dos transportes tem, no geral, baixa maturidade digital: a falta de talento digital e a natureza fragmentada do sector são apontadas como razões para o atraso.',
              fontes: ['F3.15'],
            },
          ],
          perguntas: [
            {
              enunciado: 'Como devem ser as primeiras experiências com IA?',
              opcoes: [
                'Em pequena escala, controladas e de baixo risco',
                'Em toda a organização ao mesmo tempo',
                'Só depois de condições perfeitas',
                'Sem medir resultados, para não atrasar',
              ],
              correcta: 0,
              justificacao:
                'Não se deve esperar por condições perfeitas: fazem-se experiências em pequena escala, controladas e de baixo risco.',
              fontes: ['F2.3'],
            },
            {
              enunciado: 'Qual é o caminho de adopção mais simples?',
              opcoes: [
                'Integrar uma solução comercial já pronta, com pouca ou nenhuma personalização',
                'Desenvolver um novo modelo de base de raiz',
                'Contratar uma equipa de investigação',
                'Esperar que o sector amadureça',
              ],
              correcta: 0,
              justificacao:
                'Integrar uma solução comercial já pronta, tal como está, com pouca ou nenhuma personalização, é o caminho mais simples.',
              fontes: ['F3.16'],
            },
          ],
          exercicio: {
            titulo: 'Projecto final: o plano do piloto',
            contexto:
              'Junte o que fez no curso num plano de piloto de 12 semanas, a duração do piloto da companhia aérea citado no módulo 3, para um caso de uso da sua operação.',
            passos: [
              'Caso de uso: escolha um (previsão de volumes, rotas, carga de retorno ou manutenção) e o resultado a melhorar.',
              'Referência: use o método ingénuo ou o número actual (por exemplo, a percentagem de quilómetros vazios) como ponto de partida.',
              'Meta e medida: diga quanto quer melhorar e como mede (MAE, rota mais longa, quilómetros vazios).',
              'Caminho de adopção: solução pronta, modelo aumentado ou de raiz — e porquê.',
              'Riscos e supervisão: quem acompanha, e o que faz se o sistema errar.',
              'Regra de decisão no fim: ampliar, melhorar ou descontinuar.',
            ],
            entregavel: 'Um plano de uma página com os seis pontos, pronto a apresentar à direcção.',
            solucao:
              'Exemplo: reduzir os quilómetros vazios de uma frota; referência — a percentagem actual; medida semanal; solução pronta de consolidação de cargas; responsável de operações supervisiona; no fim das 12 semanas, ampliar se a percentagem baixar de forma consistente, senão descontinuar.',
            fontes: ['F2.3', 'F2.5', 'F3.12', 'F3.16'],
          },
        },
      ],
    },
  ],
};
