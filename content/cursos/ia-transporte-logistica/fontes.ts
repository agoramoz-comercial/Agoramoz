import type { Fonte } from '@/lib/cursos/modelo';

/**
 * As fontes do curso «IA para Transporte e Logística em Moçambique» (D-49).
 *
 * Excertos públicos, consultados a 17/11/2026, de cada documento. `original`
 * é o texto tal como publicado (inglês); `texto` é a tradução da AGORAMOZ,
 * contra a qual o curso é verificado. Um teste confirma que cada número da
 * tradução está no original (`fontes.test.ts`). Onde o original tem uma
 * gralha evidente, a tradução não a repete e a nota da passagem diz qual.
 */

const CONSULTA = 'consultado a 17/11/2026';

const p = (id: string, texto: string, original: string) => ({ id, texto, original });

export const FONTES: Fonte[] = [
  {
    id: 'F1',
    titulo: 'Princípios da OCDE para a IA — definição de sistema de IA',
    autor: 'OCDE (OECD.AI)',
    data: CONSULTA,
    url: 'https://oecd.ai/en/ai-principles',
    tipo: 'web',
    lingua: 'en',
    passagens: [
      p(
        'F1.1',
        'Um sistema de IA é um sistema baseado em máquinas que, para objectivos explícitos ou implícitos, infere, a partir dos dados de entrada que recebe, como gerar resultados como previsões, conteúdos, recomendações ou decisões que podem influenciar ambientes físicos ou virtuais.',
        'An AI system is a machine-based system that, for explicit or implicit objectives, infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions that can influence physical or virtual environments.',
      ),
      p(
        'F1.2',
        'Hoje, a União Europeia, o Conselho da Europa, os Estados Unidos, as Nações Unidas e outras jurisdições usam a definição de sistema de IA da OCDE e o seu ciclo de vida nos seus quadros legislativos e regulamentares e nas suas orientações.',
        'Today, the European Union, the Council of Europe, the United States, and the United Nations and other jurisdictions use the OECD’s definition of an AI system and lifecycle below in their legislative and regulatory frameworks and guidance.',
      ),
      p(
        'F1.3',
        'Princípios baseados em valores: crescimento inclusivo, desenvolvimento sustentável e bem-estar; direitos humanos e valores democráticos, incluindo equidade e privacidade; transparência e explicabilidade; robustez, segurança e protecção; responsabilização.',
        'Values-based principles: Inclusive growth, sustainable development and well-being; Human rights and democratic values, including fairness and privacy; Transparency and explainability; Robustness, security and safety; Accountability.',
      ),
    ],
  },
  {
    id: 'F2',
    titulo: 'AI for Transport Authorities: Principles and Practical Guidance (resumo)',
    autor: 'International Transport Forum (ITF/OCDE)',
    data: CONSULTA,
    url: 'https://www.itf-oecd.org/sites/default/files/repositories/ai_use_by_transport_authorities_handout.pdf',
    tipo: 'pdf',
    lingua: 'en',
    passagens: [
      p(
        'F2.1',
        'Ao permitir a automação e a análise avançada de dados, espera-se que a IA faça os sistemas existentes executar tarefas de forma mais eficiente, oferecendo ao mesmo tempo serviços mais personalizados.',
        'By enabling automation and advanced data analysis, AI is expected to make existing systems perform tasks more efficiently, while providing more personalised services.',
      ),
      p(
        'F2.2',
        'Como acontece com outras tecnologias emergentes, as primeiras implementações de IA tendem a ser orientadas para a solução (centradas no «como») em vez de orientadas para o resultado (centradas no «para quê»). Isto pode levar as autoridades públicas a implementar a IA de forma desalinhada com os seus mandatos e missões principais.',
        'As with other emerging technologies, early deployments of AI tend to be solution-driven (i.e. focusing on the "how") rather than outcome-driven (i.e. focusing on “what for”). This may result in public authorities deploying AI in a way that is misaligned with their core mandates and missions.',
      ),
      p(
        'F2.3',
        'Usar IA traz certos riscos, mas a inacção perante a IA é também um risco estratégico. Como a IA se torna omnipresente, com um vasto leque de aplicações já no sector dos transportes, as autoridades não devem esperar por condições perfeitas antes de experimentar ou implementar IA. Em vez disso, devem fazer experiências em pequena escala, controladas e de baixo risco. Isto implica identificar casos de uso bem definidos em que se espera que a IA traga valor e possa ser testada com segurança, monitorizada, melhorada, ampliada ou descontinuada, com perturbações mínimas.',
        'Using AI carries certain risks, but inaction towards AI is also a strategic risk. As AI becomes ubiquitous, with a broad range of applications already in the transport sector, authorities should not wait for perfect conditions before experimenting with or deploying AI. Instead, they should engage in small-scale, controlled, and low-risk experimentation. This implies identifying well-defined use cases where AI is expected to bring value, can be safely tested, monitored, improved, scaled up or discontinued, with minimal disruptions.',
      ),
      p(
        'F2.4',
        'As autoridades de transporte devem considerar vários factores antes de decidir usar IA, incluindo: provas que sustentem a eficácia do sistema de IA para o uso pretendido; a disponibilidade e a qualidade dos dados com que o sistema de IA é treinado; a capacidade interna das autoridades para adoptar IA, incluindo práticas de governação e pessoal; os custos directos e indirectos de usar IA, ou de não usar; e uma avaliação de riscos rigorosa.',
        'Transport authorities should consider several factors before choosing to use AI, including: evidence supporting the AI system’s effectiveness for its intended use; the availability and quality of data on which the AI system is trained; authorities’ internal capacity to adopt AI, including governance practices and staff; the direct and indirect costs of using AI, or not; and thorough risk assessment.',
      ),
      p(
        'F2.5',
        'A IA deve produzir resultados claros e mensuráveis, alinhados com o fim a que se destina e com as missões gerais das autoridades de transporte. A reavaliação regular da IA permite às autoridades determinar se o desempenho do sistema de IA continua satisfatório face a necessidades e prioridades em mudança.',
        'AI should yield clear and measurable outcomes aligned with its intended purpose and the overarching missions of transport authorities. Regular AI re-evaluation allows authorities to determine whether the AI system’s performance remains satisfactory in light of evolving needs and priorities.',
      ),
      p(
        'F2.6',
        'Aplicação orientada para resultados: mudar o foco de «o que pode a IA fazer?» para «que resultado pode a IA melhorar?». As implementações de IA devem ser acompanhadas de uma avaliação e de uma explicação de como esse uso da IA melhora comprovadamente os resultados.',
        'Outcome-oriented application: Shift the focus from “what AI can do?” to “what outcome can AI improve?”. AI deployments should be accompanied by an assessment and an articulation of how that use of AI demonstrably improves outcomes.',
      ),
      p(
        'F2.7',
        'Supervisão humana: rever e adaptar os mecanismos de governação centrados nas pessoas (por exemplo, licenciamento, avaliação, planeamento, fiscalização) ao uso de IA pelas autoridades. Sinal de alerta — mentalidade de «tecnologia primeiro»: usar IA porque é nova ou está disponível, e não porque serve um objectivo claro.',
        'Human oversight: Review and adapt existing human-centric governance mechanisms (e.g. licensing, assessment, planning, enforcement, etc.) for AI use by authorities. ⚑ Technology-first mindset: Using AI because it is new or available, rather than because it serves a clear policy goal.',
      ),
    ],
  },
  {
    id: 'F3',
    titulo: 'Intelligent Transport, Greener Future: AI as a Catalyst to Decarbonize Global Logistics',
    autor: 'Fórum Económico Mundial',
    data: `2025, ${CONSULTA}`,
    url: 'https://reports.weforum.org/docs/WEF_Intelligent_Transport_Greener_Future_2025.pdf',
    tipo: 'pdf',
    lingua: 'en',
    passagens: [
      p(
        'F3.1',
        'Os tempos de permanência são os períodos em que veículos, motoristas ou mercadorias estão parados e não estão activamente em actividades de transporte ou entrega. Estes períodos parados podem ocorrer em várias fases das operações logísticas, como à espera de carga ou descarga, no manuseamento de artigos ou noutros atrasos. Tempos de permanência longos são uma fonte de consumo desnecessário de combustível (e, portanto, de emissões) em todo o sector dos transportes.',
        'Dwell times refer to the periods when vehicles, drivers or goods are stationary and not actively engaged in transportation or delivery activities. These idle periods can occur during various stages of logistics operations, such as waiting for loading or unloading, handling items or during other delays. Extended dwell times are a source of unnecessary fuel consumption (and therefore emissions) across the transportation sector.',
      ),
      p(
        'F3.2',
        'As tecnologias com IA podem oferecer soluções que permitem visibilidade em tempo real, rastreamento e programação e planeamento optimizados que podem reduzir o tempo de permanência.',
        'AI-powered technologies may offer solutions that enable real-time visibility, tracking and optimized scheduling and planning that can reduce dwell time.',
      ),
      p(
        'F3.3',
        'Testemunho citado no relatório: «Usamos IA para analisar padrões de tráfego e optimizar os horários de carga e descarga no porto, reduzindo os tempos parados e optimizando o uso do espaço.»',
        'We use AI to analyse traffic patterns and optimize loading and unloading schedules at the port, reducing idle times and optimizing space usage.',
      ),
      p(
        'F3.4',
        'A optimização de rotas é o planeamento e a gestão estratégica das rotas para aumentar a eficiência e a eficácia das operações logísticas. Percursos ineficientes podem traduzir-se em mais consumo de combustível, mais desgaste dos veículos e maiores custos de mão-de-obra.',
        'Route optimization refers to the strategic planning and management of routes to enhance efficiency and effectiveness in logistics operations. Inefficient miles can result in higher fuel use, more vehicle wear and greater labour costs.',
      ),
      p(
        'F3.5',
        'Os sistemas com IA usam dados em tempo real e algoritmos sofisticados para ajustar as rotas de forma dinâmica, com o máximo de eficiência e sustentabilidade. Estas soluções de optimização de rotas com IA estão disponíveis, são relativamente fáceis de implementar e podem ter grande impacto, o que faz desta área uma prioridade possível para as empresas de transporte.',
        'AI-driven systems use real-time data and sophisticated algorithms to dynamically adjust routes for maximum efficiency and sustainability. Such AI-enabled route optimization solutions are available, relatively easy to implement and can have high impact, making this area a potential priority for transport companies.',
      ),
      p(
        'F3.6',
        'Do mesmo modo, a Greenplan, uma start-up financiada pela DHL Express, desenvolveu uma ferramenta de optimização de rotas baseada em IA que pode alcançar até 20% de poupança em custos de combustível, usando 70% menos tempo de computação do que as ferramentas de roteamento convencionais.',
        'Similarly, Greenplan, a DHL Express funded start-up, developed an AI-based route optimization tool which can achieve up to 20% in fuel cost savings while using 70% less computing time than standard routing tools.',
      ),
      p(
        'F3.7',
        'Os estilos de condução influenciam muito o consumo de combustível e as emissões em todos os modos de transporte, em particular na estrada (por exemplo, acelerações e travagens bruscas) e no transporte marítimo (por exemplo, «navegar depressa e depois esperar»). No transporte rodoviário de mercadorias, este comportamento de condução aumenta as emissões em até 23%. A IA pode ajudar, usando dados em tempo real de sensores a bordo e algoritmos de aprendizagem automática para acompanhar a condução e o tempo com o motor ligado parado, juntamente com factores externos como o trânsito, o tempo e o estado das estradas.',
        'Driving styles significantly impact fuel consumption and emissions across all transportation modes, in particular the road sector (e.g. aggressive acceleration and braking) and maritime shipping sector (e.g. “sail fast then wait”). In trucking, such driving behaviour increases emissions by up to 23%. AI could help to address this problem by leveraging real-time data from on-board sensors and machine learning algorithms to monitor driving behaviour and idling, alongside external factors such as traffic, weather and road conditions.',
      ),
      p(
        'F3.8',
        'A IA está a melhorar a manutenção dos activos com soluções de manutenção preditiva que acompanham o estado dos activos, prevêem falhas, optimizam os calendários de manutenção e acompanham e mantêm o estado das baterias. As tecnologias de IA conseguem analisar grandes quantidades de dados históricos e em tempo real para identificar padrões que as pessoas podem não ver, como o desgaste do motor, a degradação dos pneus ou o desempenho dos travões, que, sem acompanhamento, podem levar a reparações caras ou a um uso ineficiente de energia.',
        'AI is enhancing asset maintenance through predictive maintenance solutions that monitor asset health, forecast potential failures, optimize maintenance schedules and monitor and maintain battery health. AI technologies can analyse vast amounts of historical and real-time data to identify patterns that humans could miss, such as engine wear, tyre degradation or brake performance, which could lead to costly repairs or inefficient power use if left unchecked.',
      ),
      p(
        'F3.9',
        'A manutenção preditiva também ganhou força com o avanço da IA. No sector ferroviário, esta manutenção proactiva custa cerca de sete vezes menos do que as reparações de emergência feitas depois de a infraestrutura falhar. Por exemplo, alguns operadores ferroviários usam plataformas de manutenção preditiva para evitar atrasos nos comboios, detectando sinais precoces de desgaste em agulhas e engrenagens, que são causas comuns de perturbações ferroviárias.',
        'Predictive maintenance has also gained traction with the rise of AI. Such proactive maintenance in the rail sector costs around seven times less than emergency repairs done after infrastructure fails, so AI-driven optimization could help deliver emission reductions and further operational savings (see Box 2). For example, some rail operators use predictive maintenance platforms to prevent train delays by detecting early signs of wear and tear on switches and gears, which are common causes of rail disruptions.',
      ),
      p(
        'F3.10',
        'Resolver estes problemas exige uma equação de optimização complexa. As soluções com IA podem ajudar a prever a procura, optimizar as práticas de carregamento, gerar cenários de procura de capacidade e sugerir as melhores rotas para reduzir o espaço vazio. Ao consolidar cargas de forma dinâmica, estes sistemas podem ajudar a reduzir emissões e a melhorar a eficiência global.',
        'Addressing these issues requires a complex optimization equation. AIpowered solutions can help to predict demand, optimize loading practices, generate capacity demand scenarios and suggest the best routes to minimize empty space. By dynamically consolidating freight loads, these systems may help reduce emissions and improve overall efficiency.',
      ),
      p(
        'F3.11',
        'A análise sugere que, se estas abordagens fossem adoptadas em todo o transporte rodoviário de mercadorias dos EUA, a capacidade vazia poderia ser reduzida em até 50%. Isto poderia evitar a emissão de 43 mil milhões de kg de CO2 por ano, o equivalente a não queimar 16 mil milhões de litros de gasóleo.',
        'Analysis suggests that if such approaches were adopted across the US trucking industry, empty capacity could be cut by as much as 50%. This could prevent the emission of 43 billion kg of CO2 annually, equivalent to avoiding the combustion of 16 billion litres of diesel fuel.',
      ),
      p(
        'F3.12',
        'A divisão de carga de uma grande companhia aérea comercial resolveu isto com uma gestão da procura e da capacidade baseada em IA. Com um modelo de «estimativa da taxa de comparência», a empresa previu com precisão a capacidade de carga reservada ao longo do tempo, tendo em conta flutuações como mudanças de peso, cancelamentos e novas reservas. Esta abordagem levou a um aumento de 8% no factor de carga durante um programa-piloto de 12 semanas.',
        'A cargo division of a large commercial airline addressed this by implementing AI-based demand and capacity management. Using a “show rate estimation” model, the company accurately predicted booked cargo capacity over time, considering fluctuations such as weight changes, cancellations and new bookings. This approach led to an 8% increase in load factor during a 12-week pilot programme.',
      ),
      p(
        'F3.13',
        'Passar mercadorias para modos de transporte mais eficientes em carbono pode reduzir as emissões globais do transporte de mercadorias em 3 a 4%. Por exemplo, passar carga de camiões de longo curso para o comboio pode reduzir o consumo de combustível por milha, para a mesma tonelagem, em até 75%, e trocar o transporte aéreo pelo marítimo pode cortar as emissões em até 95% por quilómetro, para a mesma tonelagem.',
        'Moving freight to more carbon-efficient modes of transport could reduce global freight transportation emissions by 3-4%. For example, moving cargo from long-haul trucks to rail could reduce fuel consumption per mile for the same tonnage by up to 75%, while switching from air freight to sea could cut emissions by as much as 95% per kilometre for the same tonnage.',
      ),
      p(
        'F3.14',
        'Figura 4 — mudança modal (percentagem dos volumes globais de mercadorias, antes e depois): aéreo 0,2 e 0,2; ferroviário 7,8 e 9,3 (mais 1,5); marítimo 72,8 e 73,2; rodoviário 19,2 e 17,2 (menos 2,0).',
        'FIGURE 4: Modal shifts – Transport mode | Old (% of global freight volumes) | New (% of global freight volumes) | Volume change (% of global volume): Air 0.2 | 0.2 | -0.02; Rail 7.8 | 9.3 | 1.5; Sea 72.8 | 73.2 | 0.5; Road 19.2 | 17.2 | -2.0',
      ),
      p(
        'F3.15',
        'Os resultados de dois inquéritos do Índice de Economia e Sociedade Digitais da UE sobre adopção digital e uso de IA mostram que, no geral, o sector dos transportes tem baixa maturidade digital. Os inquéritos apontam a falta de talento digital e a natureza fragmentada do sector como razões para o atraso.',
        'Findings from two surveys by the EU’s Digital Economy and Society Index on digital adoption and use of AI show that, overall, the transportation sector has low digital maturity. The surveys cite a lack of digital talent and the fragmented nature of the industry as reasons for falling behind.',
      ),
      p(
        'F3.16',
        'Três caminhos de adopção: integrar uma solução comercial de IA/aprendizagem automática já pronta nos fluxos de trabalho, tal como está, com pouca ou nenhuma personalização; aumentar modelos de IA existentes para necessidades geográficas, sectoriais e de negócio específicas, aproveitando dados e conhecimento próprios; desenvolver um novo modelo de base de raiz, à medida da organização.',
        'Integrate commercial off-the-shelf AI/ML solution into workflows as-is, with little to no customization. Augment existing AI/ML models for specific geographic, sector and business case needs, leveraging proprietary data and insights. Develop a new foundational model from scratch, tailored to the organization.',
      ),
      p(
        'F3.17',
        'Procurar oportunidades de partilha de dados entre parceiros (portos, operadores de navios, donos de frotas, carregadores e clientes) para optimizar a eficiência operacional, os volumes de carga e a utilização da capacidade. Medir e acompanhar regularmente a redução de carbono associada às iniciativas de IA, ao uso de IA e ao impacto nas operações.',
        'Seek cross-collaboration data-sharing opportunities: ports, ship operators, fleet owners, shippers and customers) to optimize operational efficiencies, load volumes and capacity utilization. – Regularly measure and track carbon reduction associated with AI initiatives, AI use and the impact on operations.',
      ),
      p(
        'F3.18',
        'Explorar formas de simplificar os processos de comércio e reduzir os problemas e atrasos transfronteiriços. Por exemplo: alinhar os formatos dos documentos a nível regional para reduzir os tempos de espera, reduzindo o consumo de combustível.',
        'Explore opportunities to streamline trade processes and reduce cross-border challenges and delays. For example: align document formats regionally to reduce dwell/wait times, reducing fuel consumption.',
      ),
    ],
  },
  {
    id: 'F4',
    titulo: 'World Bank Releases Logistics Performance Index 2023 (comunicado)',
    autor: 'Banco Mundial',
    data: '21/04/2023',
    url: 'https://www.worldbank.org/en/news/press-release/2023/04/21/world-bank-releases-logistics-performance-index-2023',
    tipo: 'web',
    lingua: 'en',
    passagens: [
      p(
        'F4.1',
        'O Índice de Desempenho Logístico (LPI) de 2023 mede a capacidade dos países para movimentar mercadorias através das fronteiras com rapidez e fiabilidade. O LPI, que abrange 139 países, mede a facilidade de estabelecer ligações fiáveis nas cadeias de abastecimento e os factores estruturais que o tornam possível, como a qualidade dos serviços logísticos, as infraestruturas de comércio e transporte e os controlos de fronteira.',
        'The World Bank today released its 2023 Logistics Performance Index report, a measure of countries’ ability to move goods across borders with speed and reliability. […] The LPI, which covers 139 countries, measures the ease of establishing reliable supply chain connections and the structural factors that make it possible, such as the quality of logistics services, tradeand transport-related infrastructure, and border controls.',
      ),
      p(
        'F4.2',
        'Em média, em todas as rotas comerciais possíveis, passam 44 dias desde que um contentor entra no porto do país exportador até sair do porto de destino, com um desvio-padrão de 10,5 dias. Esse período representa 60 por cento do tempo que leva a comercializar mercadorias a nível internacional.',
        'On average across all potential trade routes, 44 days elapse from the time a container enters the port of the exporting country until it leaves the destination port, with a standard deviation of 10.5 days. That span represents 60 percent of the time it takes to trade goods internationally.',
      ),
      p(
        'F4.3',
        'Segundo o LPI 2023, a digitalização da cadeia de abastecimento de ponta a ponta, sobretudo nas economias emergentes, está a permitir aos países reduzir os atrasos nos portos em até 70% em comparação com os países desenvolvidos. Além disso, a procura de logística verde está a crescer: 75 por cento dos carregadores procuram opções amigas do ambiente quando exportam para países de rendimento elevado.',
        'According to LPI 2023, end-to-end supply chain digitalization, especially in emerging economies, is allowing countries to shorten port delays by up to 70% compared to those in developed countries. Moreover, demand for green logistics is rising, with 75 percent of shippers looking for environmentally friendly options when exporting to high income countries.',
      ),
      p(
        'F4.4',
        '«Embora a maior parte do tempo seja passada no transporte, os maiores atrasos acontecem nos portos marítimos, nos aeroportos e nas instalações multimodais. Políticas dirigidas a estas instalações podem ajudar a melhorar a fiabilidade.» Estas políticas incluem melhorar os processos de desalfandegamento e investir em infraestruturas, adoptar tecnologias digitais e incentivar a logística ambientalmente sustentável.',
        '“While most time is spent in shipping, the biggest delays occur at seaports, airports, and multimodal facilities. Policies targeting these facilities can help improve reliability,” […] Such policies include improving clearance processes and investing in infrastructure, adopting digital technologies, and incentivizing environmentally sustainable logistics by shifting to less carbon-intensive freight modes and more energy-efficient warehousing.',
      ),
    ],
  },
  {
    id: 'F5',
    titulo: 'Port of Maputo Achieves Historic Records in Volumes (resultados de 2025)',
    autor: 'MPDC — Maputo Port Development Company',
    data: CONSULTA,
    url: 'https://www.portmaputo.com/port-of-maputo-achieves-historic-records-in-volumes-and-strengthens-its-contribution-to-national-development/',
    tipo: 'web',
    lingua: 'en',
    passagens: [
      p(
        'F5.1',
        'Em 2025, o Porto de Maputo registou um máximo histórico de volumes, movimentando um total de 32,0 milhões de toneladas, o que representa um aumento de 3,4% em relação ao ano anterior (30,9 milhões). [Nota da tradução: o original diz «30.9 million in 2025», gralha evidente — trata-se do ano anterior.]',
        'In 2025, the Port of Maputo recorded a historic all-time high in volumes, handling a total of 32.0 million tons, representing a 3.4% increase compared to the previous year (30.9 million in 2025).',
      ),
      p(
        'F5.2',
        'As operações directas da MPDC também atingiram um nível recorde, com 15,2 milhões de toneladas movimentadas, o que corresponde a um crescimento de 6,4% face ao ano anterior.',
        'MPDC’s direct operations also reached a record level, with 15.2 million tons handled, corresponding to a 6.4% growth year-on-year.',
      ),
      p(
        'F5.3',
        'Os volumes ferroviários, um pilar central da estratégia de sustentabilidade do Porto de Maputo, aumentaram 17%, passando de 9,7 milhões de toneladas em 2024 para 11,7 milhões de toneladas em 2025.',
        'Rail volumes, a central pillar of the Port of Maputo’s sustainability strategy, increased by 17%, rising from 9.7 million tons in 2024 to 11.7 million tons in 2025.',
      ),
      p(
        'F5.4',
        'O porto continuou o seu programa de investimento para aumentar a capacidade portuária e melhorar o sistema logístico, incluindo a expansão do terminal de granéis para 16 milhões de toneladas, a expansão em curso do terminal de contentores da DP World e a melhoria progressiva da eficiência ao longo do corredor logístico, com intervenções coordenadas em nós-chave.',
        'At the same time, the Port continued its investment program aimed at increasing port capacity and improving the logistics system, including: The expansion of the bulk terminal to 16 million tons; The ongoing expansion of the DP World container terminal to 530.000 TEUs; […] and the progressive improvement of efficiency along the logistics corridor, through coordinated interventions at key nodes such as Km4, Kudumba, TRAC, among others.',
      ),
    ],
  },
  {
    id: 'F6',
    titulo: 'Transport Corridors for Economic Resilience — Project Information Document (P510427)',
    autor: 'Banco Mundial',
    data: `2025, ${CONSULTA}`,
    url: 'https://documents1.worldbank.org/curated/en/099051725111539162/pdf/P510427-c8847e57-5d3a-4a5a-880c-7219c66e11f6.pdf',
    tipo: 'pdf',
    lingua: 'en',
    passagens: [
      p(
        'F6.1',
        'Na última década, cerca de 6,2 mil milhões de dólares americanos em investimentos transformaram as infraestruturas regionais de transporte do corredor de Nacala.',
        'Over the past decade, approximately US$ 6.2 billion in investments has transformed the regional transport infrastructure of the Nacala corridor.',
      ),
      p(
        'F6.2',
        'Embora os fluxos de comércio no Corredor de Nacala tenham crescido muito, o corredor tem custos de transporte por quilómetro elevados, estimados em 2,42 dólares por km. Os custos do transporte rodoviário são afectados por atrasos e pela variabilidade do tempo nas fronteiras, as estações de pesagem muitas vezes não funcionam e estão sujeitas a taxas informais, e as transferências intermodais estão sujeitas a variabilidade e atrasos. O sector ferroviário, excluindo o carvão, sofre de procura relativamente baixa e de custos mais altos porque os vagões regressam vazios.',
        'While trade flows along the Nacala Corridor have grown significantly due to public and private investments over recent years, the corridor faces high per-kilometer transport costs, with an estimate of US$2.42/km for Nacala. Road freight costs are affected by delays and time variability at border points, weight stations are often not working and subject to informal fees, and intermodal transfers subject to time variability and delays. The rail sector, excluding coal transport, suffers from relatively low demand and costs driven higher by wagons running empty on the return journey.',
      ),
      p(
        'F6.3',
        'O Ministério dos Transportes e Logística (MTL) é responsável pela política e regulação dos transportes e supervisiona o transporte rodoviário, ferroviário, marítimo e aéreo. A Administração Nacional de Estradas (ANE) gere a rede de estradas e o Fundo de Estradas (FE) administra os recursos para a manutenção. A empresa Portos e Caminhos de Ferro de Moçambique (CFM) supervisiona a operação e a manutenção dos sistemas ferroviário e portuário do país, assegurando a ligação aos países vizinhos sem litoral. O Instituto Nacional dos Transportes Rodoviários (INATRO) trata da segurança rodoviária e da gestão do trânsito.',
        'The Ministry of Transport and Logistics (MTL) is responsible for transport policy and regulation and oversees road, rail, sea, and air transport. The National Roads Administration (ANE) manages the road network, while the Road Fund (FE) administers financial resources for road maintenance and infrastructure development. The Mozambique Ports and Railways Company (CFM) oversees the operations and maintenance of the country’s railway and port systems, ensuring efficient connectivity to landlocked neighboring countries. The National Institute of Road Transport (INATRO) handles road safety and traffic management.',
      ),
      p(
        'F6.4',
        'A rede ferroviária de Moçambique tem cerca de 2 500 km e divide-se em três grandes sistemas: Sul, Centro e Norte. Pretende-se que reduza a dependência das estradas e reforce a multimodalidade. O sistema Norte faz parte do Corredor Logístico de Nacala, um corredor multimodal de 1 600 km que liga o Porto de Nacala à região carbonífera de Moatize, na província de Tete, atravessando o Malawi e chegando ao leste da Zâmbia.',
        'Mozambique’s railway network spans approximately 2,500 km and is divided into three major systems i.e., South, Central, and North. It is envisioned to reduce the reliance on roads and enhance multimodality. The northern system is part of the Nacala Logistics Corridor, a 1,600 km multimodal transport corridor connecting the Port of Nacala to the coal-rich region of Moatize in Tete Province, traversing Malawi and extending into eastern Zambia.',
      ),
      p(
        'F6.5',
        'As cidades da Beira e de Nacala são centros cruciais da rede logística nacional e da integração regional. No entanto, enfrentam desafios por causa de um desenvolvimento logístico desigual e mal coordenado.',
        'Beira and Nacala cities are crucial hubs in the national logistics and regional integration network. However, these cities face challenges due to uneven and poorly coordinated logistics development.',
      ),
      p(
        'F6.6',
        'Os produtores e comerciantes enfrentam alguns dos custos logísticos mais altos da região, por falta de economias de escala e por fraca capacidade institucional de planeamento e supervisão da logística. Fora do carvão, a procura ferroviária é limitada e cara, porque há pouca carga de retorno.',
        'Producers and traders face some of the highest logistics costs in the region due to limited economies of scale, and weak institutional capacity in logistics planning and oversight. Outside of coal, rail demand is limited and expensive, as there is little return freight.',
      ),
      p(
        'F6.7',
        'Um dos resultados-chave do projecto: indicadores-chave de desempenho (KPI) da logística de Moçambique publicados pelo Comité de Gestão do Corredor de Desenvolvimento de Nacala.',
        'Key Results — Objective 1: to improve regional transport connectivity along the Nacala Corridor in Mozambique: Mozambique Logistics KPIs published by the Nacala Development Corridor Management Committee.',
      ),
    ],
  },
  {
    id: 'F7',
    titulo: 'Development Corridors & Trade Facilitation — apresentação de Moçambique',
    autor: 'República de Moçambique (base de dados do Acordo de Facilitação do Comércio)',
    data: `Junho de 2025, ${CONSULTA}`,
    url: 'https://tfadatabase.org/fr/uploads/thematicdiscussiondocument/mozambique_corridors_tfc_june2025.pdf',
    tipo: 'pdf',
    lingua: 'en',
    passagens: [
      p(
        'F7.1',
        'Moçambique está estrategicamente situado ao longo de corredores regionais de trânsito essenciais (Nacala, Beira e Maputo). 70% da carga movimentada nos portos moçambicanos está em trânsito para países da SADC.',
        'Strategically located along key regional transit corridors (Nacala, Beira and Maputo). […] 70% of cargo handled in Mozambican ports are in transit to SADC countries.',
      ),
      p(
        'F7.2',
        'Os corredores são importantes para a economia moçambicana, facilitando o comércio com os países sem litoral. Os países sem litoral beneficiam de custos de transporte e tempos de trânsito menores. Corredor de Maputo: 2 000 camiões por dia; Corredor da Beira: 1 800 camiões por dia.',
        'The corridors are important for the Mozambican economy, facilitating trade with landlocked countries, encouraging investment in logistics infrastructure. […] Landlocked countries benefit from reduced transport costs and transit times, making their trade more competitive. Maputo Corridor – 2000 Trucks/day, Beira Corridor 1800 Trucks/day',
      ),
      p(
        'F7.3',
        'Os postos fronteiriços moçambicanos tinham atrasos e ineficiências significativos, causados sobretudo por infraestruturas desactualizadas, procedimentos fragmentados e má coordenação entre as agências de fronteira, o que provoca tempos de desalfandegamento longos, aumenta os custos para os comerciantes, prejudica a competitividade das rotas comerciais moçambicanas e, por falta de transparência, abre espaço a práticas informais.',
        'Mozambican Border Posts faced significant delays and inefficiencies caused mainly by existence of outdated infrastructure, fragmented procedures, poor coordination between different border agencies, that causes lengthy clearance times, increase costs for traders with a huge impact in competitiveness of Mozambican trade routes, lack of transparency that causes informal practices.',
      ),
      p(
        'F7.4',
        'Moçambique está a investir na simplificação e harmonização dos procedimentos aduaneiros, através da digitalização dos processos (janela única), do pré-desalfandegamento online e de uma via directa para camiões em trânsito no posto fronteiriço de Ressano Garcia, que funciona 24 horas.',
        'Mozambique is investing in the simplification and harmonization of customs procedures, trough digitalization of processes (single window), online preclearance, bypass for trucks in transit using Ressano Garcia Border Post, which work for 24-hour.',
      ),
      p(
        'F7.5',
        'Conquistas: integração na Janela Única; informação disponível no Portal do Comércio; certificado de origem electrónico; certificação fitossanitária electrónica; digitalização de vistos e licenças.',
        'Achievements: Integration into the Single Window; Information available through Trade Portal; Electronic Certificate of Origin; Electronic phytosanitary certification; Digitalization of visas and licenses.',
      ),
      p(
        'F7.6',
        'Componentes dos postos de fronteira de paragem única: implementação de sistemas electrónicos de partilha e processamento de dados; menos dependência de documentos em papel, com mais transparência; introdução de sistemas de gestão de risco para inspecções dirigidas; corredores prioritários para mercadorias em trânsito.',
        'Implementation of electronic systems for data sharing and processing. […] Reduced reliance on paper documents, improving transparency. Introduction of risk management systems for targeted inspections. […] Designated priority lanes for transit goods.',
      ),
      p(
        'F7.7',
        'O impacto é medido com indicadores-chave de desempenho: redução significativa do tempo médio de travessia da fronteira; aumento dos volumes de comércio em trânsito pelos corredores. Factores de sucesso incluem a interoperabilidade dos sistemas informáticos entre países; os próximos passos incluem aprofundar a integração digital e as plataformas de partilha de dados.',
        'Impact is measured through key performance indicators; Significant reduction in average border crossing times; Increased volumes of transit trade through the corridors […] interoperability of IT systems between countries […] Deepening digital integration and data sharing platforms',
      ),
    ],
  },
  {
    id: 'F8',
    titulo: 'Forecasting: Principles and Practice, 3.ª edição — capítulo 5',
    autor: 'Rob J. Hyndman e George Athanasopoulos (OTexts)',
    data: CONSULTA,
    url: 'https://otexts.com/fpp3/toolbox.html',
    tipo: 'web',
    lingua: 'en',
    passagens: [
      p(
        'F8.1',
        'Vamos usar quatro métodos simples de previsão como referência ao longo do livro. Por vezes, um destes métodos simples será o melhor método de previsão disponível; mas, em muitos casos, estes métodos servirão de referência em vez de serem o método escolhido.',
        'We will use four simple forecasting methods as benchmarks throughout this book. […] Sometimes one of these simple methods will be the best forecasting method available; but in many cases, these methods will serve as benchmarks rather than the method of choice.',
      ),
      p(
        'F8.2',
        'Método da média: as previsões de todos os valores futuros são iguais à média dos dados históricos.',
        'Here, the forecasts of all future values are equal to the average (or “mean”) of the historical data.',
      ),
      p(
        'F8.3',
        'Método ingénuo: para as previsões ingénuas, basta fazer todas as previsões iguais ao valor da última observação.',
        'For naïve forecasts, we simply set all forecasts to be the value of the last observation.',
      ),
      p(
        'F8.4',
        'Método da tendência (drift): uma variação do método ingénuo permite que as previsões aumentem ou diminuam ao longo do tempo, sendo a variação ao longo do tempo (a tendência) igual à variação média observada nos dados históricos.',
        'A variation on the naïve method is to allow the forecasts to increase or decrease over time, where the amount of change over time (called the drift) is set to be the average change seen in the historical data.',
      ),
      p(
        'F8.5',
        'As duas medidas mais usadas que dependem da escala baseiam-se nos erros absolutos ou nos erros ao quadrado: o erro absoluto médio (MAE) é a média dos erros absolutos. Ao comparar métodos de previsão aplicados a uma série temporal, ou a várias séries com as mesmas unidades, o MAE é popular porque é fácil de perceber e de calcular. Um método que minimiza o MAE leva a previsões da mediana, enquanto minimizar o RMSE leva a previsões da média.',
        'The two most commonly used scale-dependent measures are based on the absolute errors or squared errors: Mean absolute error: MAE=mean(∣et∣) […] When comparing forecast methods applied to a single time series, or to several time series with the same units, the MAE is popular as it is easy to both understand and compute. A forecast method that minimises the MAE will lead to forecasts of the median, while minimising the RMSE will lead to forecasts of the mean.',
      ),
    ],
  },
  {
    id: 'F9',
    titulo: 'Vehicle Routing Problem — documentação do OR-Tools',
    autor: 'Google for Developers',
    data: CONSULTA,
    url: 'https://developers.google.com/optimization/routing/vrp',
    tipo: 'web',
    lingua: 'en',
    passagens: [
      p(
        'F9.1',
        'No problema de roteamento de veículos (VRP), o objectivo é encontrar as rotas óptimas para vários veículos que visitam um conjunto de locais.',
        'In the Vehicle Routing Problem (VRP), the goal is to find optimal routes for multiple vehicles visiting a set of locations.',
      ),
      p(
        'F9.2',
        'Mas o que são «rotas óptimas» num VRP? Uma resposta são as rotas com a menor distância total. Porém, sem outras restrições, a solução óptima é atribuir um único veículo a todos os locais e encontrar a rota mais curta para esse veículo — no essencial, o mesmo problema do caixeiro-viajante (TSP).',
        'But what do we mean by "optimal routes" for a VRP? One answer is the routes with the least total distance. However, if there are no other constraints, the optimal solution is to assign just one vehicle to visit all locations, and find the shortest route for that vehicle. This is essentially the same problem as the TSP.',
      ),
      p(
        'F9.3',
        'Uma melhor forma de definir rotas óptimas é minimizar o comprimento da rota mais longa entre todos os veículos. É a definição certa se o objectivo é concluir todas as entregas o mais depressa possível.',
        'A better way to define optimal routes is to minimize the length of the longest single route among all vehicles. This is the right definition if the goal is to complete all deliveries as soon as possible.',
      ),
      p(
        'F9.4',
        'Restrições que generalizam o problema: restrições de capacidade — os veículos recolhem artigos em cada local que visitam, mas têm uma capacidade máxima de carga; janelas horárias — cada local tem de ser visitado dentro de um intervalo de tempo específico.',
        'Capacity constraints: the vehicles need to pick up items at each location they visit, but have a maximum carrying capacity. Time windows: each location must be visited within a specific time window.',
      ),
    ],
  },
];
