// fr/es/de/ar traduzidos por IA em 22/11/2026 — rever por falante nativo antes de campanhas.
import type { Texto } from '@/content/types';

/**
 * A página de diagnóstico nos dois idiomas.
 *
 * O português é, palavra por palavra, o que estava no ar (`OFFER` e o texto
 * embutido na página). `OFFER` continua a existir: `/perfil` também o lê, e
 * `/perfil` fica só em português.
 *
 * O inglês fala a um decisor que não conhece a AGORAMOZ nem Moçambique: diz o
 * que recebe, o que custa saber e o que acontece se não houver adequação — as
 * três perguntas que travam um pedido B2B a uma empresa desconhecida.
 */
export const DIAGNOSTICO = {
  metaTitulo: { pt: 'Diagnóstico Operacional Digital', en: 'Digital Operational Diagnostic', fr: 'Diagnostic opérationnel numérique', es: 'Diagnóstico Operacional Digital', de: 'Digitale Betriebsdiagnose', ar: 'التشخيص التشغيلي الرقمي' },
  metaDescricao: {
    pt: 'Saiba onde intervir antes de comprar tecnologia: processo, baseline, riscos, opções, arquitetura e roadmap numa decisão executiva clara.',
    en: 'Know where to intervene before buying technology: process, baseline, risks, options, architecture and roadmap in one clear executive decision.',
    fr: 'Sachez où intervenir avant d\'acheter de la technologie : processus, situation de référence, risques, options, architecture et feuille de route dans une décision de direction claire.',
    es: 'Sepa dónde intervenir antes de comprar tecnología: proceso, línea base, riesgos, opciones, arquitectura y hoja de ruta en una decisión ejecutiva clara.',
    de: 'Wissen, wo Sie ansetzen, bevor Sie Technologie kaufen: Prozess, Ausgangslage, Risiken, Optionen, Architektur und Roadmap in einer klaren Managemententscheidung.',
    ar: 'اعرفوا أين تتدخّلون قبل شراء التكنولوجيا: العملية والوضع المرجعي والمخاطر والخيارات والبنية وخارطة الطريق في قرار تنفيذي واضح.',
  },
  inicio: { pt: 'Início', en: 'Home', fr: 'Accueil', es: 'Inicio', de: 'Startseite', ar: 'الرئيسية' },
  trilho: { pt: 'Diagnóstico', en: 'Diagnostic', fr: 'Diagnostic', es: 'Diagnóstico', de: 'Diagnose', ar: 'التشخيص' },

  nome: { pt: 'Diagnóstico Operacional Digital', en: 'Digital Operational Diagnostic', fr: 'Diagnostic opérationnel numérique', es: 'Diagnóstico Operacional Digital', de: 'Digitale Betriebsdiagnose', ar: 'التشخيص التشغيلي الرقمي' },
  eyebrow: { pt: 'Oferta de entrada', en: 'Where to start', fr: 'Point de départ', es: 'Punto de partida', de: 'Der Einstieg', ar: 'نقطة البداية' },
  titulo: {
    pt: 'Saiba onde intervir antes de comprar tecnologia.',
    en: 'Know where to intervene before you buy technology.',
    fr: 'Sachez où intervenir avant d\'acheter de la technologie.',
    es: 'Sepa dónde intervenir antes de comprar tecnología.',
    de: 'Wissen, wo Sie ansetzen, bevor Sie Technologie kaufen.',
    ar: 'اعرفوا أين تتدخّلون قبل شراء التكنولوجيا.',
  },
  promessa: {
    pt: 'O diagnóstico transforma um problema pouco definido numa decisão executiva com processo, prioridades, riscos, opções e próximos passos claros.',
    en: 'The diagnostic turns a loosely defined problem into an executive decision with the process, priorities, risks, options and clear next steps.',
    fr: 'Le diagnostic transforme un problème mal défini en décision de direction : processus, priorités, risques, options et prochaines étapes claires.',
    es: 'El diagnóstico convierte un problema poco definido en una decisión ejecutiva con proceso, prioridades, riesgos, opciones y próximos pasos claros.',
    de: 'Die Diagnose macht aus einem unscharfen Problem eine Managemententscheidung – mit Prozess, Prioritäten, Risiken, Optionen und klaren nächsten Schritten.',
    ar: 'يحوّل التشخيص مشكلةً غير محدّدة إلى قرار تنفيذي يتضمّن العملية والأولويات والمخاطر والخيارات وخطوات تالية واضحة.',
  },
  entregas: [
    { pt: 'Definição do problema e mapa atual', en: 'Problem definition and current map', fr: 'Définition du problème et cartographie actuelle', es: 'Definición del problema y mapa actual', de: 'Problemdefinition und Ist-Landkarte', ar: 'تعريف المشكلة وخريطة الوضع الحالي' },
    { pt: 'Inventário de sistemas e dados relevantes', en: 'Inventory of relevant systems and data', fr: 'Inventaire des systèmes et données pertinents', es: 'Inventario de sistemas y datos relevantes', de: 'Bestandsaufnahme relevanter Systeme und Daten', ar: 'جرد الأنظمة والبيانات ذات الصلة' },
    { pt: 'Baseline e matriz de bloqueios', en: 'Baseline and blocker matrix', fr: 'Situation de référence et matrice des blocages', es: 'Línea base y matriz de bloqueos', de: 'Ausgangslage und Engpassmatrix', ar: 'الوضع المرجعي ومصفوفة العوائق' },
    { pt: 'Riscos e dependências', en: 'Risks and dependencies', fr: 'Risques et dépendances', es: 'Riesgos y dependencias', de: 'Risiken und Abhängigkeiten', ar: 'المخاطر والاعتماديات' },
    { pt: 'Desenho conceptual do processo futuro', en: 'Conceptual design of the future process', fr: 'Conception du processus cible', es: 'Diseño conceptual del proceso futuro', de: 'Konzept des künftigen Prozesses', ar: 'التصميم المفاهيمي للعملية المستقبلية' },
    { pt: 'Opções e prioridades', en: 'Options and priorities', fr: 'Options et priorités', es: 'Opciones y prioridades', de: 'Optionen und Prioritäten', ar: 'الخيارات والأولويات' },
    { pt: 'Arquitetura conceptual', en: 'Conceptual architecture', fr: 'Architecture conceptuelle', es: 'Arquitectura conceptual', de: 'Konzeptionelle Architektur', ar: 'البنية المفاهيمية' },
    { pt: 'Estimativa paramétrica e premissas', en: 'Parametric estimate and assumptions', fr: 'Estimation paramétrique et hypothèses', es: 'Estimación paramétrica y supuestos', de: 'Parametrische Schätzung und Annahmen', ar: 'التقدير البارامتري والافتراضات' },
    { pt: 'Roadmap e recomendação executiva', en: 'Roadmap and executive recommendation', fr: 'Feuille de route et recommandation de direction', es: 'Hoja de ruta y recomendación ejecutiva', de: 'Roadmap und Empfehlung für die Geschäftsleitung', ar: 'خارطة الطريق والتوصية التنفيذية' },
    { pt: 'Decisão sobre piloto ou implementação', en: 'Decision on a pilot or implementation', fr: 'Décision sur un pilote ou une mise en œuvre', es: 'Decisión sobre piloto o implementación', de: 'Entscheidung über Pilot oder Umsetzung', ar: 'القرار بشأن مشروع تجريبي أو التنفيذ' },
  ],
  garantia: {
    pt: 'Não inclui software em produção, integração completa, pentest ou certificação, garantia de poupança, opinião jurídica nem preço fechado para componentes ainda desconhecidos. A recomendação é independente: pode concluir não investir, corrigir o processo, configurar um sistema atual, adquirir um produto, integrar, pilotar, desenvolver ou recolher mais dados.',
    en: 'It does not include production software, full integration, a pentest or certification, guaranteed savings, legal advice, or a fixed price for components not yet known. The recommendation is independent: it may conclude not to invest, to fix the process, configure a current system, buy a product, integrate, pilot, build, or collect more data.',
    fr: 'N\'inclut pas de logiciel en production, d\'intégration complète, de test d\'intrusion ou de certification, de garantie d\'économies, d\'avis juridique ni de prix ferme pour des composants encore inconnus. La recommandation est indépendante : elle peut conclure à ne pas investir, à corriger le processus, à configurer un système existant, à acheter un produit, à intégrer, à piloter, à développer ou à collecter davantage de données.',
    es: 'No incluye software en producción, integración completa, pentest o certificación, garantía de ahorro, opinión jurídica ni precio cerrado para componentes aún desconocidos. La recomendación es independiente: puede concluir no invertir, corregir el proceso, configurar un sistema actual, adquirir un producto, integrar, pilotar, desarrollar o recopilar más datos.',
    de: 'Nicht enthalten sind produktive Software, vollständige Integration, Penetrationstest oder Zertifizierung, garantierte Einsparungen, Rechtsberatung sowie ein Festpreis für noch unbekannte Komponenten. Die Empfehlung ist unabhängig: Sie kann lauten, nicht zu investieren, den Prozess zu korrigieren, ein bestehendes System zu konfigurieren, ein Produkt zu kaufen, zu integrieren, zu pilotieren, zu entwickeln oder mehr Daten zu erheben.',
    ar: 'لا يشمل برمجيات قيد التشغيل، ولا تكاملاً كاملاً، ولا اختبار اختراق أو شهادة، ولا ضماناً للتوفير، ولا رأياً قانونياً، ولا سعراً نهائياً لمكوّنات لا تزال مجهولة. التوصية مستقلة: قد تخلص إلى عدم الاستثمار، أو تصحيح العملية، أو تهيئة نظام قائم، أو شراء منتج، أو التكامل، أو التجريب، أو التطوير، أو جمع مزيد من البيانات.',
  },

  faqEyebrow: { pt: 'Perguntas frequentes', en: 'Frequently asked questions', fr: 'Questions fréquentes', es: 'Preguntas frecuentes', de: 'Häufige Fragen', ar: 'الأسئلة الشائعة' },
  faqTitulo: { pt: 'Sobre o diagnóstico.', en: 'About the diagnostic.', fr: 'À propos du diagnostic.', es: 'Sobre el diagnóstico.', de: 'Zur Diagnose.', ar: 'عن التشخيص.' },
  faq: [
    {
      q: { pt: 'Para quem é?', en: 'Who is it for?', fr: 'Pour qui ?', es: '¿Para quién es?', de: 'Für wen ist sie gedacht?', ar: 'لمن هو موجَّه؟' },
      a: {
        pt: 'Organizações com um processo lento, manual ou pouco visível; empresas com sistemas desconectados; equipas que consideram software, automação ou IA; direções que precisam de justificar investimento; e organizações com implementações anteriores de baixa adoção.',
        en: 'Organisations with a slow, manual or opaque process; companies with disconnected systems; teams considering software, automation or AI; leadership that needs to justify an investment; and organisations whose earlier implementations saw low adoption.',
        fr: 'Les organisations dont un processus est lent, manuel ou peu visible ; les entreprises aux systèmes déconnectés ; les équipes qui envisagent un logiciel, de l\'automatisation ou de l\'IA ; les directions qui doivent justifier un investissement ; et les organisations dont les déploiements précédents ont été peu adoptés.',
        es: 'Organizaciones con un proceso lento, manual o poco visible; empresas con sistemas desconectados; equipos que consideran software, automatización o IA; direcciones que necesitan justificar una inversión; y organizaciones con implantaciones anteriores de baja adopción.',
        de: 'Organisationen mit einem langsamen, manuellen oder intransparenten Prozess; Unternehmen mit unverbundenen Systemen; Teams, die Software, Automatisierung oder KI erwägen; Geschäftsleitungen, die eine Investition begründen müssen; und Organisationen, deren frühere Einführungen wenig genutzt wurden.',
        ar: 'المؤسسات التي لديها عملية بطيئة أو يدوية أو ضعيفة الرؤية؛ والشركات ذات الأنظمة غير المترابطة؛ والفرق التي تدرس البرمجيات أو الأتمتة أو الذكاء الاصطناعي؛ والإدارات التي تحتاج إلى تبرير استثمار؛ والمؤسسات التي شهدت تطبيقات سابقة ضعيفة الاعتماد.',
      },
    },
    {
      q: { pt: 'O que investigamos?', en: 'What do we investigate?', fr: 'Qu\'analysons-nous ?', es: '¿Qué investigamos?', de: 'Was untersuchen wir?', ar: 'ما الذي نبحث فيه؟' },
      a: {
        pt: 'O trigger e o objetivo empresarial; utilizadores, processo, volumes, tempos e exceções; retrabalho, erros e dependências; dados, sistemas e integrações; segurança, privacidade e continuidade; capacidade de adoção e custo provável do estado atual.',
        en: 'The trigger and the business objective; users, process, volumes, times and exceptions; rework, errors and dependencies; data, systems and integrations; security, privacy and continuity; capacity to adopt and the likely cost of the current state.',
        fr: 'Le déclencheur et l\'objectif métier ; les utilisateurs, le processus, les volumes, les délais et les exceptions ; les reprises, les erreurs et les dépendances ; les données, les systèmes et les intégrations ; la sécurité, la confidentialité et la continuité ; la capacité d\'adoption et le coût probable de la situation actuelle.',
        es: 'El detonante y el objetivo empresarial; usuarios, proceso, volúmenes, tiempos y excepciones; retrabajo, errores y dependencias; datos, sistemas e integraciones; seguridad, privacidad y continuidad; capacidad de adopción y coste probable de la situación actual.',
        de: 'Auslöser und Geschäftsziel; Nutzer, Prozess, Mengen, Zeiten und Ausnahmen; Nacharbeit, Fehler und Abhängigkeiten; Daten, Systeme und Integrationen; Sicherheit, Datenschutz und Kontinuität; Akzeptanzfähigkeit und die wahrscheinlichen Kosten des Ist-Zustands.',
        ar: 'المحفّز والهدف التجاري؛ والمستخدمون والعملية والأحجام والأوقات والاستثناءات؛ وإعادة العمل والأخطاء والاعتماديات؛ والبيانات والأنظمة والتكاملات؛ والأمن والخصوصية والاستمرارية؛ والقدرة على الاعتماد والتكلفة المرجّحة للوضع الحالي.',
      },
    },
    {
      q: { pt: 'A avaliação inicial é gratuita?', en: 'Is the initial assessment free?', fr: 'L\'évaluation initiale est-elle gratuite ?', es: '¿La evaluación inicial es gratuita?', de: 'Ist die Erstbewertung kostenlos?', ar: 'هل التقييم الأولي مجاني؟' },
      a: {
        pt: 'Pode existir uma avaliação limitada para determinar elegibilidade — a Avaliação Inicial de Oportunidade, que termina numa nota de oportunidade e no próximo passo. Trabalho que envolva entrevistas, mapeamento, análise, arquitetura ou recomendação executiva é o Diagnóstico Executivo, e é contratado.',
        en: 'There may be a limited assessment to determine eligibility — the Initial Opportunity Assessment, which ends with an opportunity note and the next step. Work involving interviews, mapping, analysis, architecture or an executive recommendation is the Executive Diagnostic, and it is contracted.',
        fr: 'Une évaluation limitée peut déterminer l\'éligibilité — l\'Évaluation initiale d\'opportunité, qui se conclut par une note d\'opportunité et la prochaine étape. Tout travail impliquant entretiens, cartographie, analyse, architecture ou recommandation de direction relève du Diagnostic exécutif, qui fait l\'objet d\'un contrat.',
        es: 'Puede haber una evaluación limitada para determinar la elegibilidad: la Evaluación Inicial de Oportunidad, que termina en una nota de oportunidad y el siguiente paso. El trabajo que implique entrevistas, mapeo, análisis, arquitectura o recomendación ejecutiva es el Diagnóstico Ejecutivo, y se contrata.',
        de: 'Eine begrenzte Bewertung kann die Eignung klären – die Erste Chancenbewertung, die mit einer Chancennotiz und dem nächsten Schritt endet. Arbeit mit Interviews, Prozessaufnahme, Analyse, Architektur oder Managementempfehlung ist die Executive-Diagnose und wird beauftragt.',
        ar: 'قد يُجرى تقييم محدود لتحديد الأهلية — التقييم الأولي للفرصة، الذي ينتهي بمذكرة فرصة والخطوة التالية. أما العمل الذي يتضمّن مقابلات أو رسم خرائط أو تحليلاً أو بنية أو توصية تنفيذية فهو التشخيص التنفيذي، ويتم التعاقد عليه.',
      },
    },
    {
      q: { pt: 'O diagnóstico obriga a contratar a implementação?', en: 'Does the diagnostic oblige us to contract the implementation?', fr: 'Le diagnostic oblige-t-il à confier la mise en œuvre ?', es: '¿El diagnóstico obliga a contratar la implementación?', de: 'Verpflichtet die Diagnose zur Beauftragung der Umsetzung?', ar: 'هل يُلزم التشخيصُ بالتعاقد على التنفيذ؟' },
      a: {
        pt: 'Não. O cliente pode não avançar, executar internamente ou contratar outro fornecedor, conforme os termos acordados.',
        en: 'No. The client may decide not to proceed, to execute internally or to hire another supplier, under the agreed terms.',
        fr: 'Non. Le client peut ne pas donner suite, réaliser en interne ou faire appel à un autre prestataire, selon les conditions convenues.',
        es: 'No. El cliente puede no avanzar, ejecutarlo internamente o contratar a otro proveedor, según los términos acordados.',
        de: 'Nein. Der Kunde kann verzichten, intern umsetzen oder einen anderen Anbieter beauftragen – gemäß den vereinbarten Bedingungen.',
        ar: 'لا. يمكن للعميل ألّا يمضي قدماً، أو أن ينفّذ داخلياً، أو أن يتعاقد مع مورّد آخر، وفقاً للشروط المتفق عليها.',
      },
    },
    {
      q: { pt: 'Quanto tempo demora?', en: 'How long does it take?', fr: 'Combien de temps cela prend-il ?', es: '¿Cuánto tiempo dura?', de: 'Wie lange dauert es?', ar: 'كم يستغرق من الوقت؟' },
      a: {
        pt: 'Depende do número de pessoas a entrevistar e da complexidade do processo. A duração é estimada e comunicada depois desta primeira conversa, não antes de sabermos o que vamos analisar.',
        en: 'It depends on how many people we need to interview and how complex the process is. We estimate the duration and share it after this first conversation — not before we know what we are analysing.',
        fr: 'Cela dépend du nombre de personnes à interroger et de la complexité du processus. La durée est estimée et communiquée après ce premier échange, pas avant de savoir ce que nous allons analyser.',
        es: 'Depende del número de personas que entrevistar y de la complejidad del proceso. La duración se estima y se comunica después de esta primera conversación, no antes de saber qué vamos a analizar.',
        de: 'Das hängt davon ab, wie viele Personen wir befragen und wie komplex der Prozess ist. Wir schätzen die Dauer und teilen sie nach diesem ersten Gespräch mit – nicht bevor wir wissen, was wir analysieren.',
        ar: 'يعتمد ذلك على عدد الأشخاص الذين سنقابلهم وعلى تعقيد العملية. تُقدَّر المدة وتُبلَّغ بعد هذه المحادثة الأولى، لا قبل أن نعرف ما الذي سنحلّله.',
      },
    },
    {
      q: {
        pt: 'Preciso de ter tudo definido antes de submeter?',
        en: 'Do I need to have everything defined before I submit?',
        fr: 'Dois-je avoir tout défini avant d\'envoyer ?',
        es: '¿Necesito tenerlo todo definido antes de enviar?',
        de: 'Muss ich vor dem Absenden alles festgelegt haben?',
        ar: 'هل عليّ أن أحدّد كل شيء قبل الإرسال؟',
      },
      a: {
        pt: 'Não. Não precisa de escolher uma tecnologia. Descreva o processo, a consequência e o que já tentou — o resto é o que o diagnóstico existe para descobrir.',
        en: 'No. You do not need to choose a technology. Describe the process, the consequence and what you have already tried — the rest is what the diagnostic is for.',
        fr: 'Non. Inutile de choisir une technologie. Décrivez le processus, la conséquence et ce que vous avez déjà essayé — le reste, c\'est ce que le diagnostic doit découvrir.',
        es: 'No. No necesita elegir una tecnología. Describa el proceso, la consecuencia y lo que ya ha intentado: el resto es lo que el diagnóstico existe para descubrir.',
        de: 'Nein. Sie müssen keine Technologie wählen. Beschreiben Sie den Prozess, die Folge und was Sie bereits versucht haben – den Rest herauszufinden ist Aufgabe der Diagnose.',
        ar: 'لا. لا تحتاجون إلى اختيار تقنية. صِفوا العملية والنتيجة وما جرّبتموه — أما الباقي فهو ما وُجد التشخيص لاكتشافه.',
      },
    },
  ],
} as const satisfies Record<string, Texto | readonly Texto[] | readonly { q: Texto; a: Texto }[]>;
