import { PERGUNTA_MAX, PERGUNTA_MIN } from '@/lib/civico/limites';

/**
 * AGORAMOZ Cívico — o texto da página `/civico`.
 *
 * Só em português: a lei moçambicana publica-se em português e é nessa língua
 * que as pessoas a procuram. Uma versão inglesa entra quando houver razão
 * para ela, em `ROTAS_BILINGUES`, como as outras.
 *
 * Três regras que este ficheiro cumpre, e que quem o editar deve manter:
 *
 * 1. **Nenhum número sem fonte.** O portal de origem anunciava «9.500+
 *    documentos» e «10 segundos»; nenhum dos dois era verificável, e por isso
 *    nenhum está aqui. A página não promete quantidade de documentos nem
 *    tempo de resposta.
 * 2. **Nenhuma resposta escrita por nós.** Os temas trazem PERGUNTAS de
 *    exemplo, nunca respostas feitas: uma resposta escrita à mão sobre a lei
 *    fica errada no dia em que a lei muda, e ninguém se lembra de a corrigir.
 * 3. **Nenhum depoimento.** É a regra do site inteiro (`content/types.ts`).
 */

export const MARCA_CIVICO = 'AGORAMOZ Cívico';

export const CIVICO = {
  metaTitulo: 'Cívico: a lei moçambicana explicada, com a fonte',
  metaDescricao:
    'Pergunte sobre trabalho, família, heranças, segurança social, impostos ou documentos em Moçambique. Resposta em linguagem simples, com ligação para a fonte.',

  inicio: 'Início',
  trilho: 'Cívico',
  nav: 'Cívico',

  eyebrow: 'Informação cívica · Moçambique',
  titulo: 'Pergunte sobre a lei. Receba a resposta com a fonte.',
  promessa:
    'Trabalho, família, heranças, segurança social, impostos, documentos. Escreva a sua dúvida por palavras suas e receba uma explicação em linguagem simples, com ligação para a fonte quando ela existe.',

  /** A ficha ao lado do título: três factos sobre o serviço, nenhum deles um número. */
  ficha: [
    { rotulo: 'Conta', valor: 'Não é precisa' },
    { rotulo: 'Custo', valor: 'Gratuito' },
    { rotulo: 'Natureza', valor: 'Informação, não parecer jurídico' },
  ],

  // ── Compositor ─────────────────────────────────────────────────────────
  rotuloPergunta: 'A sua pergunta',
  dicaPergunta: 'Não inclua nomes, contactos nem números de documentos: não são precisos para responder.',
  rotuloSeguimento: 'Pergunta de seguimento',
  dicaSeguimento: 'O assistente tem em conta as perguntas anteriores desta conversa.',
  perguntar: 'Perguntar',
  aPerguntar: 'A procurar…',
  aPerguntarDetalhe: 'A procurar nas fontes e a escrever a resposta. Costuma levar alguns segundos.',
  aEscrever: 'A escrever a resposta…',
  /** `{p}` é substituído por uma pergunta de exemplo, que vai rodando. */
  exemplo: 'Por exemplo: {p}',
  pronta: 'Resposta pronta.',
  /** `{n}` é substituído pelos caracteres que faltam. */
  contador: '{n} caracteres disponíveis',
  desligado: 'A consulta ainda não está activa neste site. Volte em breve.',

  erroCurta: `Escreva a pergunta com pelo menos ${PERGUNTA_MIN} caracteres.`,
  erroLonga: `A pergunta tem de caber em ${PERGUNTA_MAX} caracteres. Faça uma pergunta de cada vez.`,
  erroAmbito:
    'Isto parece uma ordem ao assistente, não uma pergunta. Escreva a sua dúvida sobre a lei ou sobre um serviço público.',
  erroDado: {
    email: 'A pergunta parece ter um endereço de e-mail. Retire-o: não é preciso para responder.',
    numero:
      'A pergunta parece ter um número de telefone ou de documento. Retire-o: não é preciso para responder.',
  },
  erros: {
    400: 'Este pedido não pôde ser lido. Reescreva a pergunta e tente de novo.',
    413: 'A pergunta é demasiado longa. Faça uma pergunta de cada vez.',
    429: 'Atingiu o limite de perguntas por agora. Tente de novo dentro de alguns minutos.',
    502: 'O assistente não conseguiu responder a esta pergunta. Tente escrevê-la de outra forma.',
    503: 'A consulta não está disponível neste momento. Tente de novo mais tarde.',
    504: 'A resposta demorou demasiado. Tente de novo.',
    rede: 'Sem ligação. Verifique a rede e tente de novo.',
  },

  // ── Resposta ───────────────────────────────────────────────────────────
  respostaEyebrow: 'Resposta',
  perguntaRotulo: 'Pergunta',
  tabelaAria: 'Tabela da resposta',
  fontesTitulo: 'Ligações citadas nesta resposta',
  fonteEstado: 'gov.mz',
  fonteEstadoAria: 'Domínio do Estado moçambicano',
  fonteExterna: 'Fonte externa',
  /**
   * O motor cita muitas vezes a lei pelo nome («Lei n.º 22/2022») sem ligação —
   * visto na primeira consulta real. O aviso diz o que fazer com isso, em vez
   * de dizer que a resposta «não tem fonte», o que nesses casos seria falso.
   */
  semFonte:
    'Esta resposta não traz ligação para um texto oficial. Se citar uma lei pelo nome, procure esse diploma no Boletim da República e confirme antes de agir.',
  avisoResposta:
    'Gerado por inteligência artificial a partir de informação pública. Pode conter erros ou estar desactualizado: a lei muda. Confirme na fonte e, num caso concreto, fale com um advogado.',
  tentarDeNovo: 'Tentar de novo',
  whatsapp: 'Enviar por WhatsApp',
  imprimir: 'Imprimir ou guardar em PDF',
  copiar: 'Copiar resposta',
  copiado: 'Copiado',
  novaConversa: 'Nova conversa',
  novaConversaAria: 'Apagar esta conversa e começar outra',
  abreNoutroSeparador: '(abre noutro separador)',

  // ── Texto oficial e conferência ────────────────────────────────────────
  oficialTitulo: 'Texto oficial',
  oficialNota:
    'Copiado do Boletim da República, não escrito pelo assistente. A escolha dos artigos é automática: podem não ser todos os que se aplicam ao seu caso.',
  oficialArtigo: 'Artigo',
  oficialCortado: 'O artigo continua no diploma.',
  oficialPagina: 'Abrir a página deste artigo',
  oficialVer: 'Ver o diploma completo',
  iaEyebrow: 'Explicação gerada por IA',
  /** `{partes}` é substituído pelo que saiu («2 citações e 1 número de artigo»). */
  conferenciaNota:
    'Retirámos desta resposta {partes}: o assistente escreveu-os, mas não constam do texto oficial que conferimos.',
  conferenciaPartes: {
    citacoes: ['citação entre aspas', 'citações entre aspas'],
    artigos: ['número de artigo', 'números de artigo'],
    contactos: ['contacto', 'contactos'],
  },

  // ── Verificação de vigência ────────────────────────────────────────────
  vigenciaRevogadoTitulo: 'Atenção: esta resposta cita legislação revogada',
  vigenciaRevogadoCorpo:
    'As regras descritas abaixo podem já não ser as que valem. Leia o diploma que a substituiu antes de agir.',
  vigenciaMencionadoTitulo: 'A resposta refere um diploma revogado e o que o substituiu',
  vigenciaMencionadoCorpo: 'Confirme que as regras descritas são as do diploma mais recente.',
  vigenciaCitado: 'Citado na resposta',
  vigenciaSubstituto: 'Revogado por',
  vigenciaVer: 'Ver o diploma no Boletim da República',
  diplomasTitulo: 'Diplomas citados e verificação de vigência',
  diplomaEstado: {
    revogado: 'Revogado',
    substituto: 'Conferido',
    'por-verificar': 'Por verificar',
  },
  /** `{data}` é substituído pela data em que o registo foi conferido. */
  diplomasNota:
    '«Conferido»: lemos no Boletim da República, a {data}, que este diploma revogou o anterior sobre a mesma matéria. «Por verificar»: a AGORAMOZ ainda não conferiu a vigência deste diploma.',

  anterioresTitulo: 'Nesta conversa',
  anterioresNota:
    'Fica só neste separador. Ao fechar ou recarregar a página, desaparece: não guardamos as suas perguntas.',
  anterioresVazio: 'As suas perguntas aparecem aqui.',

  // ── Temas ──────────────────────────────────────────────────────────────
  temasEyebrow: 'Por onde começar',
  temasTitulo: 'Seis temas, as dúvidas de todos os dias.',
  temasNota: 'Escolha uma pergunta para a enviar, ou escreva a sua.',
  temas: [
    {
      id: 'trabalho',
      nome: 'Trabalho',
      perguntas: [
        'Que aviso prévio tem de dar o empregador para rescindir o contrato de trabalho?',
        'A quantos dias de férias tenho direito por ano?',
        'O que posso fazer se o salário for pago com atraso?',
      ],
    },
    {
      id: 'familia',
      nome: 'Família e heranças',
      perguntas: [
        'Quem herda quando alguém morre sem deixar testamento?',
        'Que direitos tem quem vive em união de facto?',
        'Como se regista um nascimento fora do prazo?',
      ],
    },
    {
      id: 'seguranca-social',
      nome: 'Segurança social',
      perguntas: [
        'Quem tem direito à pensão de velhice do INSS?',
        'Quem trabalha por conta própria pode inscrever-se no INSS?',
        'Que subsídios existem em caso de doença?',
      ],
    },
    {
      id: 'impostos',
      nome: 'Impostos e negócios',
      perguntas: [
        'Qual é a taxa do IVA em Moçambique?',
        'O que é o ISPC e quem pode aderir?',
        'Que passos são precisos para registar uma empresa?',
      ],
    },
    {
      id: 'documentos',
      nome: 'Documentos',
      perguntas: [
        'Que documentos são precisos para renovar o bilhete de identidade?',
        'Como se pede o NUIT pela primeira vez?',
        'Como se pede o passaporte?',
      ],
    },
    {
      id: 'habitacao',
      nome: 'Habitação e terra',
      perguntas: [
        'O que é o DUAT e como se obtém?',
        'Que direitos tem o inquilino em caso de despejo?',
        'O senhorio pode aumentar a renda quando quiser?',
      ],
    },
  ],

  // ── Como funciona ──────────────────────────────────────────────────────
  passosEyebrow: 'Como funciona',
  passosTitulo: 'Da dúvida à fonte, em três passos.',
  passos: [
    {
      titulo: 'Escreva a dúvida',
      corpo: 'Por palavras suas, sem termos jurídicos. Sem conta, sem nome e sem dados que identifiquem alguém.',
    },
    {
      titulo: 'O assistente procura',
      corpo:
        'A pergunta segue, sem nomes, para o motor do portal cívico, com uma nota sobre os diplomas que já foram revogados.',
    },
    {
      titulo: 'Leia, confirme, decida',
      corpo:
        'A página mostra o texto oficial dos artigos que encontrou e confere o que o assistente escreveu. O que não consta do texto oficial é retirado.',
    },
  ],

  // ── O que é e o que não é ──────────────────────────────────────────────
  limitesEyebrow: 'Com transparência',
  limitesTitulo: 'O que isto é, e o que não é.',
  eTitulo: 'É',
  e: [
    'Informação pública explicada em linguagem simples.',
    'Com texto oficial: nos temas que já cobrimos, os artigos vêm copiados do Boletim da República.',
    'Conferido: citações, números de artigo e contactos que não constam do texto oficial são retirados.',
    'Anónimo: sem conta, sem nome, sem e-mail e sem telefone.',
  ],
  naoETitulo: 'Não é',
  naoE: [
    'Um parecer jurídico, nem substitui um advogado.',
    'Infalível: é inteligência artificial, pode errar e pode estar desactualizada.',
    'Um serviço do Estado: a AGORAMOZ é uma empresa privada.',
    'Um sítio para contar um caso com nomes, contactos ou documentos.',
  ],

  privacidadeTitulo: 'O que acontece à sua pergunta',
  privacidade: [
    'A pergunta segue do nosso servidor para o motor do portal cívico, que a processa com modelos de inteligência artificial de terceiros.',
    'A AGORAMOZ não guarda a pergunta nem a resposta, e não as associa a si: não pedimos nome, e-mail nem telefone.',
    'Antes de a pergunta seguir, recusamos contactos e números de documentos e retiramos os nomes de pessoas que conseguimos reconhecer. O motor pode guardar o texto da conversa; na página pública dele aparece só o tema da consulta, nunca a pergunta.',
  ],

  // ── Perguntas frequentes ───────────────────────────────────────────────
  faqEyebrow: 'Perguntas frequentes',
  faqTitulo: 'Antes de confiar numa resposta.',
  faq: [
    {
      q: 'Isto substitui um advogado?',
      a: 'Não. O que recebe é informação pública explicada de forma simples, não um parecer sobre o seu caso. Uma decisão com consequências — assinar, despedir, partilhar uma herança, recorrer — pede um advogado que conheça os factos.',
    },
    {
      q: 'De onde vêm as respostas?',
      a: 'De um motor de inteligência artificial que procura em documentos públicos moçambicanos e escreve a explicação, citando a lei pelo nome. Quando a resposta traz ligações, aparecem numeradas no fim, com o domínio à vista. Quando não traz nenhuma, a página avisa.',
    },
    {
      q: 'A resposta pode estar errada?',
      a: 'Pode. A inteligência artificial engana-se, e a lei muda: um diploma pode ter sido revogado ou alterado depois de o documento ter sido lido. É por isso que cada resposta pede que confirme na fonte.',
    },
    {
      q: 'O assistente pode inventar uma lei ou um artigo?',
      a: 'Um modelo de inteligência artificial pode sempre escrever algo que não existe; nenhum sistema o impede por completo. O que fazemos é não o deixar passar: uma citação entre aspas só aparece se estiver, palavra por palavra, no texto oficial que temos; um número de artigo só aparece se for de um artigo que mostramos; um contacto escrito pelo assistente é sempre retirado. Quando retiramos alguma coisa, a página diz quantas.',
    },
    {
      q: 'Que leis têm texto oficial na página?',
      a: 'Para já, a Lei do Trabalho, a Lei das Sucessões e a Lei da Família. Nos outros temas o assistente explica por palavras suas, sem citações nem números de artigo, e a página manda confirmar no Boletim da República.',
    },
    {
      q: 'O que é a verificação de vigência?',
      a: 'A AGORAMOZ mantém um registo de revogações lidas no Boletim da República. Cada resposta é comparada com esse registo: se citar um diploma revogado, aparece um aviso com o diploma que o substituiu. O registo é pequeno e vai crescendo; um diploma marcado «por verificar» ainda não foi conferido.',
    },
    {
      q: 'Guardam o que eu pergunto?',
      a: 'A AGORAMOZ não guarda perguntas nem respostas. O motor que responde pode guardar o texto da conversa para melhorar a cobertura; na página pública dele aparece só o tema. Não escreva nomes, contactos nem números de documentos.',
    },
    {
      q: 'É gratuito?',
      a: 'Sim. Não há conta nem pagamento. Há um limite de perguntas por período, para o serviço continuar disponível para todos.',
    },
    {
      q: 'A quem recorrer num caso concreto?',
      a: 'A um advogado inscrito na Ordem dos Advogados de Moçambique. Quem não pode pagar pode procurar o Instituto do Patrocínio e Assistência Jurídica (IPAJ), o serviço público de assistência jurídica.',
    },
  ],

  // ── Para organizações ──────────────────────────────────────────────────
  orgTitulo: 'Um assistente assim, com as fontes da sua organização.',
  orgCorpo:
    'O mesmo princípio serve um ministério, um banco ou uma empresa: respostas ancoradas em documentos próprios, com a origem citada e passagem a uma pessoa quando o assistente não sabe.',
  orgCta: 'Ver agentes de IA',
  orgHref: '/solucoes/agentes-ia',
} as const;

export type TemaCivico = (typeof CIVICO.temas)[number];

/**
 * As páginas da lei (D-47): o texto oficial do corpus, artigo a artigo. Só o
 * enquadramento é texto nosso; o texto de cada artigo é o do Boletim da
 * República.
 */
export const LEI = {
  trilho: 'Leis',
  indiceTitulo: 'Leis de Moçambique, artigo a artigo',
  indiceMetaTitulo: 'Leis de Moçambique: texto oficial artigo a artigo',
  indiceMetaDescricao:
    'Lei do Trabalho, Lei das Sucessões e Lei da Família de Moçambique, artigo a artigo, com o texto oficial do Boletim da República, para ler no telemóvel.',
  indiceLead:
    'O texto oficial do Boletim da República, um artigo por página, fácil de ler no telemóvel e de partilhar. Cada página liga ao PDF de onde o texto foi extraído.',
  eyebrow: 'Texto oficial',
  artigos: 'artigos',
  verArtigos: 'Ver os artigos',
  fonte: 'Fonte',
  fonteNota: (data: string) =>
    `Texto extraído automaticamente do PDF oficial a ${data}. Antes de agir com base nele, confirme no original do Boletim da República.`,
  revogou: 'Esta lei revogou',
  emFalta: (n: number, lista: string) =>
    `${n === 1 ? 'Falta o artigo' : `Faltam ${n} artigos`} ${lista}: a extracção do PDF não os leu com segurança, e um texto duvidoso não se publica. Consulte-os no original.`,
  anterior: 'Artigo anterior',
  seguinte: 'Artigo seguinte',
  relacionados: 'Artigos relacionados',
  todos: 'Todos os artigos',
  perguntaTitulo: 'Tem uma dúvida sobre este artigo?',
  perguntaTexto:
    'O AGORAMOZ Cívico responde a perguntas sobre a lei em linguagem simples, com o texto oficial ao lado. Gratuito, sem conta.',
  perguntaCta: 'Perguntar ao AGORAMOZ Cívico',
  naoParecer: 'Informação pública, não parecer jurídico. Para o seu caso concreto, consulte um advogado.',
} as const;
