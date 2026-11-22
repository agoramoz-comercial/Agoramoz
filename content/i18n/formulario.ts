// fr/es/de/ar traduzidos por IA em 22/11/2026 — rever por falante nativo antes de campanhas.
import type { Lingua, SectorSlug, Texto } from '@/content/types';
import type { CartaoId } from '@/lib/forms/lead-schema';

/**
 * O formulário de diagnóstico nos dois idiomas: a interface, as mensagens de
 * validação e os rótulos dos setores dos mercados de operação.
 *
 * O português é, palavra por palavra, o que estava embutido no formulário e no
 * schema. Nenhum leitor português vê uma vírgula diferente.
 *
 * O inglês não é tradução literal. «Decido», «Decido em conjunto» são respostas
 * na primeira pessoa porque é assim que se responde a «qual o seu papel?» — em
 * inglês ficam na primeira pessoa também, e com a forma que um decisor
 * britânico ou americano usaria.
 */

/**
 * A pergunta de cada cartão do carrossel. Uma pergunta, na segunda pessoa de
 * cortesia, curta o bastante para caber numa linha de telemóvel.
 * `{moeda}` é substituído no componente.
 */
export const PERGUNTAS: Record<CartaoId, Texto> = {
  pais: { pt: 'Onde opera a sua empresa?', en: 'Where does your company operate?', fr: 'Où votre entreprise opère-t-elle ?', es: '¿Dónde opera su empresa?', de: 'Wo ist Ihr Unternehmen tätig?', ar: 'أين تعمل شركتكم؟' },
  setor: { pt: 'Em que setor?', en: 'In which sector?', fr: 'Dans quel secteur ?', es: '¿En qué sector?', de: 'In welcher Branche?', ar: 'في أي قطاع؟' },
  processos: { pt: 'O que pretende melhorar?', en: 'What do you want to improve?', fr: 'Que souhaitez-vous améliorer ?', es: '¿Qué quiere mejorar?', de: 'Was möchten Sie verbessern?', ar: 'ما الذي تودّون تحسينه؟' },
  dimensao: { pt: 'Quantas pessoas trabalham na empresa?', en: 'How many people work at the company?', fr: 'Combien de personnes travaillent dans l\'entreprise ?', es: '¿Cuántas personas trabajan en la empresa?', de: 'Wie viele Personen arbeiten im Unternehmen?', ar: 'كم عدد الأشخاص الذين يعملون في الشركة؟' },
  prazo: { pt: 'Quando quer decidir?', en: 'When do you want to decide?', fr: 'Quand souhaitez-vous décider ?', es: '¿Cuándo quiere decidir?', de: 'Wann möchten Sie entscheiden?', ar: 'متى تودّون اتخاذ القرار؟' },
  papel: { pt: 'Qual é o seu papel na decisão?', en: 'What is your role in the decision?', fr: 'Quel est votre rôle dans la décision ?', es: '¿Cuál es su papel en la decisión?', de: 'Welche Rolle haben Sie bei der Entscheidung?', ar: 'ما هو دوركم في القرار؟' },
  faixa: { pt: 'Que investimento tem em mente? ({moeda})', en: 'What investment do you have in mind? ({moeda})', fr: 'Quel investissement envisagez-vous ? ({moeda})', es: '¿Qué inversión tiene en mente? ({moeda})', de: 'An welche Investition denken Sie? ({moeda})', ar: 'ما حجم الاستثمار الذي تفكرون فيه؟ ({moeda})' },
  impacto: { pt: 'Conte-nos onde a operação está bloqueada.', en: 'Tell us where the operation is stuck.', fr: 'Dites-nous où l\'activité est bloquée.', es: 'Cuéntenos dónde está bloqueada la operación.', de: 'Sagen Sie uns, wo der Betrieb ins Stocken gerät.', ar: 'أخبرونا أين تتعثّر العمليات.' },
  contacto: { pt: 'Como o contactamos?', en: 'How do we reach you?', fr: 'Comment vous contacter ?', es: '¿Cómo le contactamos?', de: 'Wie erreichen wir Sie?', ar: 'كيف نتواصل معكم؟' },
};

export const TAMANHOS = {
  '1-9': { pt: '1 a 9 colaboradores', en: '1 to 9 employees', fr: '1 à 9 collaborateurs', es: '1 a 9 empleados', de: '1 bis 9 Mitarbeitende', ar: 'من 1 إلى 9 موظفين' },
  '10-49': { pt: '10 a 49', en: '10 to 49', fr: '10 à 49', es: '10 a 49', de: '10 bis 49', ar: 'من 10 إلى 49' },
  '50-249': { pt: '50 a 249', en: '50 to 249', fr: '50 à 249', es: '50 a 249', de: '50 bis 249', ar: 'من 50 إلى 249' },
  '250+': { pt: '250 ou mais', en: '250 or more', fr: '250 ou plus', es: '250 o más', de: '250 oder mehr', ar: '250 أو أكثر' },
} as const satisfies Record<string, Texto>;

export const PRAZOS = {
  imediato: { pt: 'Imediato', en: 'Immediately', fr: 'Immédiatement', es: 'Inmediato', de: 'Sofort', ar: 'فوراً' },
  '1-3-meses': { pt: 'Nos próximos 1 a 3 meses', en: 'Within the next 1 to 3 months', fr: 'Dans les 1 à 3 prochains mois', es: 'En los próximos 1 a 3 meses', de: 'In den nächsten 1 bis 3 Monaten', ar: 'خلال الأشهر الثلاثة المقبلة' },
  '3-6-meses': { pt: 'Em 3 a 6 meses', en: 'In 3 to 6 months', fr: 'D\'ici 3 à 6 mois', es: 'En 3 a 6 meses', de: 'In 3 bis 6 Monaten', ar: 'خلال 3 إلى 6 أشهر' },
  'sem-data': { pt: 'Ainda sem data', en: 'No date yet', fr: 'Pas encore de date', es: 'Todavía sin fecha', de: 'Noch kein Termin', ar: 'لم يُحدَّد موعد بعد' },
} as const satisfies Record<string, Texto>;

export const PAPEIS = {
  decisor: { pt: 'Decido', en: 'I make the decision', fr: 'Je décide', es: 'Decido yo', de: 'Ich entscheide', ar: 'أنا صاحب القرار' },
  'co-decisor': { pt: 'Decido em conjunto', en: 'I decide jointly with others', fr: 'Je décide avec d\'autres', es: 'Decido junto con otros', de: 'Ich entscheide gemeinsam mit anderen', ar: 'أتخذ القرار بالاشتراك مع آخرين' },
  influenciador: { pt: 'Influencio a decisão', en: 'I influence the decision', fr: 'J\'influence la décision', es: 'Influyo en la decisión', de: 'Ich beeinflusse die Entscheidung', ar: 'أؤثّر في القرار' },
  pesquisa: { pt: 'Estou a recolher informação', en: 'I am gathering information', fr: 'Je recueille des informations', es: 'Estoy recopilando información', de: 'Ich sammle Informationen', ar: 'أجمع المعلومات' },
} as const satisfies Record<string, Texto>;

/** Pelo `value` de `IMPROVEMENT_GOALS`: o valor guardado é o mesmo nos dois idiomas. */
export const OBJETIVOS = {
  aquisicao: { pt: 'Geração e conversão de oportunidades', en: 'Generating and converting opportunities', fr: 'Génération et conversion d\'opportunités', es: 'Generación y conversión de oportunidades', de: 'Gewinnung und Abschluss von Verkaufschancen', ar: 'توليد الفرص وتحويلها إلى صفقات' },
  atendimento: { pt: 'Atendimento', en: 'Customer service', fr: 'Service client', es: 'Atención al cliente', de: 'Kundenservice', ar: 'خدمة العملاء' },
  operacoes: { pt: 'Operações', en: 'Operations', fr: 'Opérations', es: 'Operaciones', de: 'Betrieb', ar: 'العمليات' },
  administrativo: { pt: 'Trabalho administrativo', en: 'Administrative work', fr: 'Travail administratif', es: 'Trabajo administrativo', de: 'Verwaltungsarbeit', ar: 'العمل الإداري' },
  integracao: { pt: 'Integração de sistemas', en: 'Systems integration', fr: 'Intégration de systèmes', es: 'Integración de sistemas', de: 'Systemintegration', ar: 'تكامل الأنظمة' },
  informacao: { pt: 'Acesso à informação', en: 'Access to information', fr: 'Accès à l\'information', es: 'Acceso a la información', de: 'Zugang zu Informationen', ar: 'الوصول إلى المعلومات' },
  experiencia: { pt: 'Experiência digital', en: 'Digital experience', fr: 'Expérience numérique', es: 'Experiencia digital', de: 'Digitale Nutzererfahrung', ar: 'التجربة الرقمية' },
  reporting: { pt: 'Reporting e decisão', en: 'Reporting and decision-making', fr: 'Reporting et prise de décision', es: 'Reporting y toma de decisiones', de: 'Reporting und Entscheidungsfindung', ar: 'التقارير واتخاذ القرار' },
} as const satisfies Record<string, Texto>;

/** Pelo valor de `CONSEQUENCES`: o valor guardado é o mesmo nos dois idiomas. */
export const CONSEQUENCIAS = {
  oportunidades: { pt: 'Oportunidades perdidas', en: 'Lost opportunities', fr: 'Opportunités perdues', es: 'Oportunidades perdidas', de: 'Verlorene Chancen', ar: 'فرص ضائعة' },
  'trabalho-manual': { pt: 'Trabalho manual', en: 'Manual work', fr: 'Travail manuel', es: 'Trabajo manual', de: 'Manuelle Arbeit', ar: 'عمل يدوي' },
  atraso: { pt: 'Atraso', en: 'Delay', fr: 'Retard', es: 'Retraso', de: 'Verzögerung', ar: 'تأخير' },
  erro: { pt: 'Erro', en: 'Error', fr: 'Erreur', es: 'Error', de: 'Fehler', ar: 'خطأ' },
  risco: { pt: 'Risco', en: 'Risk', fr: 'Risque', es: 'Riesgo', de: 'Risiko', ar: 'مخاطرة' },
  custo: { pt: 'Custo', en: 'Cost', fr: 'Coût', es: 'Coste', de: 'Kosten', ar: 'تكلفة' },
  experiencia: { pt: 'Experiência do cliente', en: 'Customer experience', fr: 'Expérience client', es: 'Experiencia del cliente', de: 'Kundenerlebnis', ar: 'تجربة العميل' },
} as const satisfies Record<string, Texto>;

/** Setores dos três mercados de operação. O português continua a viver em `SECTOR_LABELS`. */
export const ROTULO_SETOR: Record<SectorSlug, Texto> = {
  agronegocio: { pt: 'Agricultura e agronegócio', en: 'Agriculture and agribusiness', fr: 'Agriculture et agro-industrie', es: 'Agricultura y agronegocio', de: 'Landwirtschaft und Agrarwirtschaft', ar: 'الزراعة والأعمال الزراعية' },
  'energia-mineracao': { pt: 'Energia, mineração e serviços industriais', en: 'Energy, mining and industrial services', fr: 'Énergie, mines et services industriels', es: 'Energía, minería y servicios industriales', de: 'Energie, Bergbau und Industriedienstleistungen', ar: 'الطاقة والتعدين والخدمات الصناعية' },
  logistica: { pt: 'Logística e transportes', en: 'Logistics and transport', fr: 'Logistique et transport', es: 'Logística y transporte', de: 'Logistik und Transport', ar: 'الخدمات اللوجستية والنقل' },
  'construcao-imobiliario': { pt: 'Construção e imobiliário', en: 'Construction and real estate', fr: 'Construction et immobilier', es: 'Construcción e inmobiliario', de: 'Bau und Immobilien', ar: 'البناء والعقارات' },
  'comercio-servicos': { pt: 'Comércio e serviços B2B', en: 'B2B trade and services', fr: 'Commerce et services B2B', es: 'Comercio y servicios B2B', de: 'B2B-Handel und -Dienstleistungen', ar: 'التجارة والخدمات بين الشركات' },
  'turismo-hotelaria': { pt: 'Turismo, hotelaria e alojamento', en: 'Tourism, hospitality and accommodation', fr: 'Tourisme, hôtellerie et hébergement', es: 'Turismo, hostelería y alojamiento', de: 'Tourismus, Hotellerie und Unterkunft', ar: 'السياحة والفنادق والإقامة' },
  industria: { pt: 'Indústria e fabricação', en: 'Industry and manufacturing', fr: 'Industrie et fabrication', es: 'Industria y fabricación', de: 'Industrie und Fertigung', ar: 'الصناعة والتصنيع' },
  'servicos-profissionais': { pt: 'Serviços profissionais B2B', en: 'B2B professional services', fr: 'Services professionnels B2B', es: 'Servicios profesionales B2B', de: 'Professionelle B2B-Dienstleistungen', ar: 'الخدمات المهنية بين الشركات' },
  'logistica-comercio': { pt: 'Logística, transportes e comércio', en: 'Logistics, transport and trade', fr: 'Logistique, transport et commerce', es: 'Logística, transporte y comercio', de: 'Logistik, Transport und Handel', ar: 'الخدمات اللوجستية والنقل والتجارة' },
  'financas-seguros': { pt: 'Serviços financeiros, seguros e fintech', en: 'Financial services, insurance and fintech', fr: 'Services financiers, assurance et fintech', es: 'Servicios financieros, seguros y fintech', de: 'Finanzdienstleistungen, Versicherungen und Fintech', ar: 'الخدمات المالية والتأمين والتقنية المالية' },
  'tecnologia-saas': { pt: 'Tecnologia e SaaS', en: 'Technology and SaaS', fr: 'Technologie et SaaS', es: 'Tecnología y SaaS', de: 'Technologie und SaaS', ar: 'التكنولوجيا والبرمجيات كخدمة' },
  'industria-energia-construcao': { pt: 'Indústria, energia e construção', en: 'Industry, energy and construction', fr: 'Industrie, énergie et construction', es: 'Industria, energía y construcción', de: 'Industrie, Energie und Bau', ar: 'الصناعة والطاقة والبناء' },
};

/** `{n}`, `{total}`, `{moeda}` e `{indicativo}` são substituídos no componente. */
export const FORM = {
  pergunta: { pt: 'Pergunta {n} de {total}', en: 'Question {n} of {total}', fr: 'Question {n} sur {total}', es: 'Pregunta {n} de {total}', de: 'Frage {n} von {total}', ar: 'السؤال {n} من {total}' },
  minutos: { pt: 'cerca de {min} min', en: 'about {min} min', fr: 'environ {min} min', es: 'unos {min} min', de: 'etwa {min} Min.', ar: 'حوالي {min} دقيقة' },
  avancaSozinho: {
    pt: 'Escolha uma opção e avançamos para a pergunta seguinte.',
    en: 'Pick an option and we move on to the next question.',
    fr: 'Choisissez une option et nous passons à la question suivante.',
    es: 'Elija una opción y pasamos a la siguiente pregunta.',
    de: 'Wählen Sie eine Option, dann geht es zur nächsten Frage.',
    ar: 'اختاروا خياراً وننتقل إلى السؤال التالي.',
  },
  impactoOpcionalDica: {
    pt: 'Opcional. Descreva um caso recente, incluindo atrasos, erros, repetição ou pouca visibilidade.',
    en: 'Optional. Describe a recent case, including delays, errors, repetition or poor visibility.',
    fr: 'Facultatif. Décrivez un cas récent : retards, erreurs, répétitions ou manque de visibilité.',
    es: 'Opcional. Describa un caso reciente: retrasos, errores, repetición o poca visibilidad.',
    de: 'Optional. Beschreiben Sie einen aktuellen Fall – Verzögerungen, Fehler, Doppelarbeit oder fehlende Transparenz.',
    ar: 'اختياري. صِفوا حالة حديثة، بما في ذلك التأخير أو الأخطاء أو التكرار أو ضعف الرؤية.',
  },
  impactoIntro: {
    pt: 'Não precisa de escolher uma tecnologia. Descreva o processo, a consequência e o que já tentou.',
    en: 'You do not need to choose a technology. Describe the process, the consequence and what you have already tried.',
    fr: 'Inutile de choisir une technologie. Décrivez le processus, la conséquence et ce que vous avez déjà essayé.',
    es: 'No necesita elegir una tecnología. Describa el proceso, la consecuencia y lo que ya ha intentado.',
    de: 'Sie müssen keine Technologie wählen. Beschreiben Sie den Prozess, die Folge und was Sie bereits versucht haben.',
    ar: 'لا تحتاجون إلى اختيار تقنية. صِفوا العملية والنتيجة وما جرّبتموه حتى الآن.',
  },
  consequencia: { pt: 'Consequência', en: 'Consequence', fr: 'Conséquence', es: 'Consecuencia', de: 'Folge', ar: 'النتيجة' },
  consequenciaDica: {
    pt: 'Oportunidades, trabalho manual, atraso, erro, risco, custo ou experiência. Pode escolher mais do que uma.',
    en: 'Opportunities, manual work, delay, error, risk, cost or experience. You can choose more than one.',
    fr: 'Opportunités, travail manuel, retard, erreur, risque, coût ou expérience. Vous pouvez en choisir plusieurs.',
    es: 'Oportunidades, trabajo manual, retraso, error, riesgo, coste o experiencia. Puede elegir más de una.',
    de: 'Chancen, manuelle Arbeit, Verzögerung, Fehler, Risiko, Kosten oder Erlebnis. Mehrfachauswahl möglich.',
    ar: 'الفرص أو العمل اليدوي أو التأخير أو الخطأ أو المخاطرة أو التكلفة أو التجربة. يمكنكم اختيار أكثر من خيار.',
  },
  sistemas: { pt: 'Sistemas', en: 'Systems', fr: 'Systèmes', es: 'Sistemas', de: 'Systeme', ar: 'الأنظمة' },
  sistemasDica: { pt: 'Ferramentas e sistemas que participam no processo.', en: 'Tools and systems involved in the process.', fr: 'Outils et systèmes impliqués dans le processus.', es: 'Herramientas y sistemas que intervienen en el proceso.', de: 'Werkzeuge und Systeme, die am Prozess beteiligt sind.', ar: 'الأدوات والأنظمة المشاركة في العملية.' },
  decisao: { pt: 'Decisão', en: 'Decision', fr: 'Décision', es: 'Decisión', de: 'Entscheidung', ar: 'القرار' },
  decisaoDica: { pt: 'Que decisão pretende tomar?', en: 'What decision do you want to make?', fr: 'Quelle décision souhaitez-vous prendre ?', es: '¿Qué decisión quiere tomar?', de: 'Welche Entscheidung möchten Sie treffen?', ar: 'ما القرار الذي تودّون اتخاذه؟' },
  avisoSeguranca: {
    pt: 'Não envie palavras-passe, dados sensíveis, ficheiros confidenciais ou informação pessoal desnecessária.',
    en: 'Do not send passwords, sensitive data, confidential files or unnecessary personal information.',
    fr: 'N\'envoyez pas de mots de passe, de données sensibles, de fichiers confidentiels ni d\'informations personnelles inutiles.',
    es: 'No envíe contraseñas, datos sensibles, archivos confidenciales ni información personal innecesaria.',
    de: 'Senden Sie keine Passwörter, sensiblen Daten, vertraulichen Dateien oder unnötigen personenbezogenen Daten.',
    ar: 'لا ترسلوا كلمات مرور أو بيانات حساسة أو ملفات سرية أو معلومات شخصية غير ضرورية.',
  },
  saltar: { pt: 'Saltar', en: 'Skip', fr: 'Passer', es: 'Saltar', de: 'Überspringen', ar: 'تخطٍّ' },
  irPara: { pt: 'Ir para a pergunta {n}: {pergunta}', en: 'Go to question {n}: {pergunta}', fr: 'Aller à la question {n} : {pergunta}', es: 'Ir a la pregunta {n}: {pergunta}', de: 'Zu Frage {n}: {pergunta}', ar: 'الانتقال إلى السؤال {n}: {pergunta}' },
  progresso: { pt: 'Progresso do diagnóstico', en: 'Diagnostic progress', fr: 'Progression du diagnostic', es: 'Progreso del diagnóstico', de: 'Fortschritt der Diagnose', ar: 'تقدّم التشخيص' },
  carregando: { pt: 'A carregar o diagnóstico…', en: 'Loading the diagnostic…', fr: 'Chargement du diagnostic…', es: 'Cargando el diagnóstico…', de: 'Diagnose wird geladen …', ar: 'جارٍ تحميل التشخيص…' },
  corrija: { pt: 'Corrija os seguintes campos:', en: 'Please correct the following fields:', fr: 'Veuillez corriger les champs suivants :', es: 'Corrija los siguientes campos:', de: 'Bitte korrigieren Sie folgende Felder:', ar: 'يُرجى تصحيح الحقول التالية:' },
  paisOperacao: { pt: 'País de operação', en: 'Country of operation', fr: 'Pays d\'activité', es: 'País de operación', de: 'Land der Geschäftstätigkeit', ar: 'بلد النشاط' },
  global: { pt: 'Global', en: 'Global', fr: 'International', es: 'Global', de: 'International', ar: 'عالمي' },
  setor: { pt: 'Setor', en: 'Sector', fr: 'Secteur', es: 'Sector', de: 'Branche', ar: 'القطاع' },
  nomeEmpresa: { pt: 'Nome da empresa', en: 'Company name', fr: 'Nom de l\'entreprise', es: 'Nombre de la empresa', de: 'Name des Unternehmens', ar: 'اسم الشركة' },
  colaboradores: { pt: 'Número de colaboradores', en: 'Number of employees', fr: 'Nombre de collaborateurs', es: 'Número de empleados', de: 'Anzahl der Mitarbeitenden', ar: 'عدد الموظفين' },
  website: { pt: 'Website atual', en: 'Current website', fr: 'Site web actuel', es: 'Sitio web actual', de: 'Aktuelle Website', ar: 'الموقع الإلكتروني الحالي' },
  websiteDica: { pt: 'Se ainda não tiver, deixe em branco.', en: 'If you do not have one yet, leave this blank.', fr: 'Si vous n\'en avez pas encore, laissez vide.', es: 'Si aún no tiene, déjelo en blanco.', de: 'Falls noch keine vorhanden, leer lassen.', ar: 'إن لم يكن لديكم موقع بعد، اتركوا الحقل فارغاً.' },
  websiteExemplo: { pt: 'exemplo.com', en: 'example.com', fr: 'exemple.com', es: 'ejemplo.com', de: 'beispiel.de', ar: 'example.com' },
  melhorar: { pt: 'O que pretende melhorar?', en: 'What do you want to improve?', fr: 'Que souhaitez-vous améliorer ?', es: '¿Qué quiere mejorar?', de: 'Was möchten Sie verbessern?', ar: 'ما الذي تودّون تحسينه؟' },
  melhorarDica: {
    pt: 'Por exemplo: pedidos, propostas, aprovações, entregas, reporting ou suporte. Pode escolher mais do que um.',
    en: 'For example: requests, proposals, approvals, deliveries, reporting or support. You can choose more than one.',
    fr: 'Par exemple : demandes, propositions, validations, livraisons, reporting ou support. Vous pouvez en choisir plusieurs.',
    es: 'Por ejemplo: pedidos, propuestas, aprobaciones, entregas, reporting o soporte. Puede elegir más de uno.',
    de: 'Zum Beispiel: Anfragen, Angebote, Freigaben, Lieferungen, Reporting oder Support. Mehrfachauswahl möglich.',
    ar: 'مثلاً: الطلبات أو العروض أو الموافقات أو التسليمات أو التقارير أو الدعم. يمكنكم اختيار أكثر من خيار.',
  },
  impacto: { pt: 'Problema', en: 'Problem', fr: 'Problème', es: 'Problema', de: 'Problem', ar: 'المشكلة' },
  prazo: { pt: 'Prazo da decisão', en: 'Decision timeframe', fr: 'Échéance de la décision', es: 'Plazo de la decisión', de: 'Entscheidungszeitraum', ar: 'الإطار الزمني للقرار' },
  faixa: { pt: 'Faixa de investimento ({moeda})', en: 'Investment range ({moeda})', fr: 'Fourchette d\'investissement ({moeda})', es: 'Rango de inversión ({moeda})', de: 'Investitionsrahmen ({moeda})', ar: 'نطاق الاستثمار ({moeda})' },
  papel: { pt: 'O seu papel na decisão', en: 'Your role in the decision', fr: 'Votre rôle dans la décision', es: 'Su papel en la decisión', de: 'Ihre Rolle bei der Entscheidung', ar: 'دوركم في القرار' },
  nome: { pt: 'Nome', en: 'Name', fr: 'Nom', es: 'Nombre', de: 'Name', ar: 'الاسم' },
  email: { pt: 'Email profissional', en: 'Work email', fr: 'E-mail professionnel', es: 'Correo electrónico profesional', de: 'Geschäftliche E-Mail', ar: 'البريد الإلكتروني المهني' },
  telefone: { pt: 'Telefone ou WhatsApp', en: 'Phone or WhatsApp', fr: 'Téléphone ou WhatsApp', es: 'Teléfono o WhatsApp', de: 'Telefon oder WhatsApp', ar: 'الهاتف أو واتساب' },
  indicativo: { pt: 'Indicativo {indicativo}', en: 'Country code {indicativo}', fr: 'Indicatif {indicativo}', es: 'Prefijo {indicativo}', de: 'Vorwahl {indicativo}', ar: 'رمز الدولة {indicativo}' },
  politica: { pt: 'Política de privacidade', en: 'Privacy policy', fr: 'Politique de confidentialité', es: 'Política de privacidad', de: 'Datenschutzerklärung', ar: 'سياسة الخصوصية' },
  opcional: { pt: '(opcional)', en: '(optional)', fr: '(facultatif)', es: '(opcional)', de: '(optional)', ar: '(اختياري)' },

  erroTitulo: { pt: 'Não foi possível enviar o pedido.', en: 'We could not send your request.', fr: 'Impossible d\'envoyer la demande.', es: 'No se pudo enviar la solicitud.', de: 'Die Anfrage konnte nicht gesendet werden.', ar: 'تعذّر إرسال الطلب.' },
  erroCorpo: {
    pt: 'As suas respostas continuam aqui — carregue outra vez em enviar. Se voltar a falhar, fale connosco por',
    en: 'Your answers are still here — press send again. If it fails again, contact us on',
    fr: 'Vos réponses sont conservées ici — cliquez de nouveau sur envoyer. Si cela échoue encore, contactez-nous par',
    es: 'Sus respuestas siguen aquí: pulse de nuevo enviar. Si vuelve a fallar, contáctenos por',
    de: 'Ihre Antworten bleiben erhalten – klicken Sie erneut auf Senden. Wenn es wieder fehlschlägt, kontaktieren Sie uns per',
    ar: 'إجاباتكم محفوظة هنا — اضغطوا على إرسال مرة أخرى. إن تكرّر الخطأ، تواصلوا معنا عبر',
  },
  ou: { pt: 'ou', en: 'or', fr: 'ou', es: 'o', de: 'oder', ar: 'أو' },

  voltar: { pt: 'Voltar', en: 'Back', fr: 'Retour', es: 'Volver', de: 'Zurück', ar: 'رجوع' },
  continuar: { pt: 'Continuar', en: 'Continue', fr: 'Continuer', es: 'Continuar', de: 'Weiter', ar: 'متابعة' },
  enviar: { pt: 'Enviar para avaliação', en: 'Send for assessment', fr: 'Envoyer pour évaluation', es: 'Enviar para evaluación', de: 'Zur Bewertung senden', ar: 'إرسال للتقييم' },

  recebido: { pt: 'Recebemos o seu pedido.', en: 'We received your request.', fr: 'Nous avons bien reçu votre demande.', es: 'Hemos recibido su solicitud.', de: 'Wir haben Ihre Anfrage erhalten.', ar: 'تلقّينا طلبكم.' },
  recebidoCorpo: {
    pt: 'Analisaremos o processo descrito, a consequência, a urgência e a adequação às capacidades da AGORAMOZ. Se existir enquadramento, a próxima conversa servirá para clarificar o problema e decidir entre avaliação, diagnóstico ou outra abordagem.',
    en: 'We will review the process you described, the consequence, the urgency and the fit with AGORAMOZ capabilities. If there is a fit, the next conversation will clarify the problem and decide between an assessment, a diagnostic or another approach.',
    fr: 'Nous analyserons le processus décrit, la conséquence, l\'urgence et l\'adéquation avec les capacités d\'AGORAMOZ. S\'il y a adéquation, le prochain échange servira à clarifier le problème et à choisir entre une évaluation, un diagnostic ou une autre approche.',
    es: 'Analizaremos el proceso descrito, la consecuencia, la urgencia y la adecuación a las capacidades de AGORAMOZ. Si hay encaje, la próxima conversación servirá para aclarar el problema y decidir entre una evaluación, un diagnóstico u otro enfoque.',
    de: 'Wir prüfen den beschriebenen Prozess, die Folge, die Dringlichkeit und die Passung zu den Fähigkeiten von AGORAMOZ. Wenn es passt, klären wir im nächsten Gespräch das Problem und entscheiden zwischen einer Bewertung, einer Diagnose oder einem anderen Ansatz.',
    ar: 'سنحلّل العملية التي وصفتموها والنتيجة ومدى الإلحاح والملاءمة لقدرات AGORAMOZ. وإن وُجدت ملاءمة، فستُخصَّص المحادثة التالية لتوضيح المشكلة والاختيار بين تقييم أو تشخيص أو نهج آخر.',
  },
  oQueRecebemos: { pt: 'O que recebemos', en: 'What we received', fr: 'Ce que nous avons reçu', es: 'Lo que hemos recibido', de: 'Was wir erhalten haben', ar: 'ما تلقّيناه' },
  mercado: { pt: 'Mercado', en: 'Market', fr: 'Marché', es: 'Mercado', de: 'Markt', ar: 'السوق' },
  faixaIndicada: { pt: 'Faixa indicada', en: 'Range indicated', fr: 'Fourchette indiquée', es: 'Rango indicado', de: 'Angegebener Rahmen', ar: 'النطاق المُحدَّد' },
  prazoCurto: { pt: 'Prazo', en: 'Timeframe', fr: 'Échéance', es: 'Plazo', de: 'Zeitraum', ar: 'الإطار الزمني' },
  agora: { pt: 'O que acontece agora', en: 'What happens next', fr: 'La suite', es: 'Qué ocurre ahora', de: 'Wie es weitergeht', ar: 'ما الذي يحدث الآن' },
  agora1: {
    pt: 'Lemos o que descreveu e identificamos o bloqueio principal.',
    en: 'We read what you described and identify the main bottleneck.',
    fr: 'Nous lisons votre description et identifions le blocage principal.',
    es: 'Leemos lo que ha descrito e identificamos el bloqueo principal.',
    de: 'Wir lesen Ihre Beschreibung und ermitteln den Hauptengpass.',
    ar: 'نقرأ ما وصفتموه ونحدّد العائق الرئيسي.',
  },
  agora2: {
    pt: 'Respondemos por email com o problema, a viabilidade e o próximo passo.',
    en: 'We reply by email with the problem, its feasibility and the next step.',
    fr: 'Nous répondons par e-mail avec le problème, sa faisabilité et la prochaine étape.',
    es: 'Respondemos por correo con el problema, la viabilidad y el siguiente paso.',
    de: 'Wir antworten per E-Mail mit dem Problem, der Machbarkeit und dem nächsten Schritt.',
    ar: 'نردّ عبر البريد الإلكتروني بالمشكلة وجدواها والخطوة التالية.',
  },
  agora3: {
    pt: 'Se fizer sentido avançar, marcamos uma conversa objetiva.',
    en: 'If it makes sense to go ahead, we schedule a focused conversation.',
    fr: 'S\'il est pertinent d\'avancer, nous fixons un échange ciblé.',
    es: 'Si tiene sentido avanzar, agendamos una conversación concreta.',
    de: 'Wenn es sinnvoll ist weiterzumachen, vereinbaren wir ein zielgerichtetes Gespräch.',
    ar: 'إن كان من المنطقي المضيّ قدماً، نحدّد موعداً لمحادثة مركّزة.',
  },
  marcar: { pt: 'Marcar a conversa agora', en: 'Book the conversation now', fr: 'Réserver l\'échange maintenant', es: 'Reservar la conversación ahora', de: 'Gespräch jetzt buchen', ar: 'احجزوا المحادثة الآن' },
  marcarDica: {
    pt: 'Escolha o dia e a hora na agenda da equipa. Abre num separador novo; a videochamada vem no convite.',
    en: 'Pick a day and time in the team calendar. It opens in a new tab; the video call link comes with the invitation.',
    fr: 'Choisissez le jour et l\'heure dans l\'agenda de l\'équipe. Il s\'ouvre dans un nouvel onglet ; le lien de visioconférence figure dans l\'invitation.',
    es: 'Elija el día y la hora en la agenda del equipo. Se abre en una pestaña nueva; el enlace de la videollamada llega con la invitación.',
    de: 'Wählen Sie Tag und Uhrzeit im Kalender des Teams. Er öffnet sich in einem neuen Tab; der Videolink kommt mit der Einladung.',
    ar: 'اختاروا اليوم والساعة من جدول الفريق. يُفتح في علامة تبويب جديدة، ويصلكم رابط مكالمة الفيديو مع الدعوة.',
  },
  whatsapp: { pt: 'Acrescentar algo por WhatsApp', en: 'Add something on WhatsApp', fr: 'Ajouter quelque chose par WhatsApp', es: 'Añadir algo por WhatsApp', de: 'Etwas per WhatsApp ergänzen', ar: 'أضيفوا شيئاً عبر واتساب' },
  verSolucoes: { pt: 'Ver as soluções entretanto', en: 'See the solutions in the meantime', fr: 'Voir les solutions en attendant', es: 'Ver las soluciones mientras tanto', de: 'Lösungen in der Zwischenzeit ansehen', ar: 'اطّلعوا على الحلول في الأثناء' },
} as const satisfies Record<string, Texto>;

/**
 * Mensagens de validação. Em português, as que estavam no schema. Em inglês,
 * escritas para não coincidirem com o texto por omissão do Zod («Invalid
 * input», «Required») — o teste de mensagens recusa-o nos dois idiomas.
 */
export const VALIDACAO = {
  pais: { pt: 'Selecione o país.', en: 'Choose the country.', fr: 'Choisissez le pays.', es: 'Seleccione el país.', de: 'Wählen Sie das Land.', ar: 'اختاروا البلد.' },
  setor: { pt: 'Selecione o setor.', en: 'Choose the sector.', fr: 'Choisissez le secteur.', es: 'Seleccione el sector.', de: 'Wählen Sie die Branche.', ar: 'اختاروا القطاع.' },
  empresa: { pt: 'Indique o nome da empresa.', en: 'Enter the company name.', fr: 'Indiquez le nom de l\'entreprise.', es: 'Indique el nombre de la empresa.', de: 'Geben Sie den Namen des Unternehmens an.', ar: 'أدخلوا اسم الشركة.' },
  dimensao: { pt: 'Selecione a dimensão da equipa.', en: 'Choose the size of the team.', fr: 'Choisissez la taille de l\'équipe.', es: 'Seleccione el tamaño del equipo.', de: 'Wählen Sie die Teamgröße.', ar: 'اختاروا حجم الفريق.' },
  websiteLongo: { pt: 'O endereço é demasiado longo.', en: 'That address is too long.', fr: 'L\'adresse est trop longue.', es: 'La dirección es demasiado larga.', de: 'Die Adresse ist zu lang.', ar: 'العنوان طويل جداً.' },
  processo: { pt: 'Selecione pelo menos um processo.', en: 'Choose at least one process.', fr: 'Choisissez au moins un processus.', es: 'Seleccione al menos un proceso.', de: 'Wählen Sie mindestens einen Prozess.', ar: 'اختاروا عملية واحدة على الأقل.' },
  impactoLongo: {
    pt: 'A descrição não pode passar de 1500 caracteres.',
    en: 'The description cannot be longer than 1500 characters.',
    fr: 'La description ne peut pas dépasser 1500 caractères.',
    es: 'La descripción no puede superar los 1500 caracteres.',
    de: 'Die Beschreibung darf höchstens 1500 Zeichen lang sein.',
    ar: 'لا يمكن أن يتجاوز الوصف 1500 حرف.',
  },
  prazo: { pt: 'Selecione o prazo de decisão.', en: 'Choose the decision timeframe.', fr: 'Choisissez l\'échéance de la décision.', es: 'Seleccione el plazo de decisión.', de: 'Wählen Sie den Entscheidungszeitraum.', ar: 'اختاروا الإطار الزمني للقرار.' },
  faixa: { pt: 'Selecione uma faixa.', en: 'Choose a range.', fr: 'Choisissez une fourchette.', es: 'Seleccione un rango.', de: 'Wählen Sie einen Rahmen.', ar: 'اختاروا نطاقاً.' },
  papel: { pt: 'Selecione o seu papel na decisão.', en: 'Choose your role in the decision.', fr: 'Choisissez votre rôle dans la décision.', es: 'Seleccione su papel en la decisión.', de: 'Wählen Sie Ihre Rolle bei der Entscheidung.', ar: 'اختاروا دوركم في القرار.' },
  nome: { pt: 'Indique o seu nome.', en: 'Enter your name.', fr: 'Indiquez votre nom.', es: 'Indique su nombre.', de: 'Geben Sie Ihren Namen an.', ar: 'أدخلوا اسمكم.' },
  email: { pt: 'Indique um email válido.', en: 'Enter a work email we can reply to.', fr: 'Indiquez un e-mail professionnel auquel répondre.', es: 'Indique un correo profesional al que podamos responder.', de: 'Geben Sie eine geschäftliche E-Mail-Adresse an, auf die wir antworten können.', ar: 'أدخلوا بريداً إلكترونياً مهنياً يمكننا الرد عليه.' },
  telefone: { pt: 'Indique um contacto telefónico.', en: 'Enter a phone number.', fr: 'Indiquez un numéro de téléphone.', es: 'Indique un número de teléfono.', de: 'Geben Sie eine Telefonnummer an.', ar: 'أدخلوا رقم هاتف.' },
  consequencia: { pt: 'Escolha uma consequência da lista.', en: 'Choose a consequence from the list.', fr: 'Choisissez une conséquence dans la liste.', es: 'Elija una consecuencia de la lista.', de: 'Wählen Sie eine Folge aus der Liste.', ar: 'اختاروا نتيجة من القائمة.' },
  textoCurtoLongo: { pt: 'Use no máximo 300 caracteres.', en: 'Use 300 characters at most.', fr: '300 caractères au maximum.', es: 'Use como máximo 300 caracteres.', de: 'Höchstens 300 Zeichen.', ar: 'استخدموا 300 حرف كحدّ أقصى.' },
  consentimento: {
    pt: 'É necessário o seu consentimento para prosseguir.',
    en: 'We need your consent to continue.',
    fr: 'Votre consentement est nécessaire pour continuer.',
    es: 'Necesitamos su consentimiento para continuar.',
    de: 'Ihre Einwilligung ist erforderlich, um fortzufahren.',
    ar: 'نحتاج إلى موافقتكم للمتابعة.',
  },
} as const satisfies Record<string, Texto>;

/* ---------------------------------------------------------------------------
   Línguas de leitura (fr, es, de, ar). O servidor e os registos de mercado
   continuam em português e inglês; o formulário mostra estas versões por cima
   do inglês. Uma entrada em falta mostra o inglês (ver `traduzirMercado`).
   --------------------------------------------------------------------------- */

type Extra = 'fr' | 'es' | 'de' | 'ar';
type Quatro = Readonly<Record<Extra, string>>;

/** Os treze mercados do diagnóstico, pelo código. */
export const NOME_MERCADO: Readonly<Record<string, Quatro>> = {
  mz: { fr: 'Mozambique', es: 'Mozambique', de: 'Mosambik', ar: 'موزمبيق' },
  pt: { fr: 'Portugal', es: 'Portugal', de: 'Portugal', ar: 'البرتغال' },
  br: { fr: 'Brésil', es: 'Brasil', de: 'Brasilien', ar: 'البرازيل' },
  ch: { fr: 'Suisse', es: 'Suiza', de: 'Schweiz', ar: 'سويسرا' },
  sg: { fr: 'Singapour', es: 'Singapur', de: 'Singapur', ar: 'سنغافورة' },
  us: { fr: 'États-Unis', es: 'Estados Unidos', de: 'Vereinigte Staaten', ar: 'الولايات المتحدة' },
  uk: { fr: 'Royaume-Uni', es: 'Reino Unido', de: 'Vereinigtes Königreich', ar: 'المملكة المتحدة' },
  de: { fr: 'Allemagne', es: 'Alemania', de: 'Deutschland', ar: 'ألمانيا' },
  fr: { fr: 'France', es: 'Francia', de: 'Frankreich', ar: 'فرنسا' },
  ae: { fr: 'Émirats arabes unis', es: 'Emiratos Árabes Unidos', de: 'Vereinigte Arabische Emirate', ar: 'الإمارات العربية المتحدة' },
  sa: { fr: 'Arabie saoudite', es: 'Arabia Saudí', de: 'Saudi-Arabien', ar: 'المملكة العربية السعودية' },
  za: { fr: 'Afrique du Sud', es: 'Sudáfrica', de: 'Südafrika', ar: 'جنوب أفريقيا' },
  ca: { fr: 'Canada', es: 'Canadá', de: 'Kanada', ar: 'كندا' },
};

/** Os setores dos dez mercados globais, pelo nome inglês (o mesmo slug muda de nome entre países). */
export const SETOR_GLOBAL: Readonly<Record<string, Quatro>> = {
  'Aerospace and defence': { fr: 'Aéronautique et défense', es: 'Aeroespacial y defensa', de: 'Luft- und Raumfahrt und Verteidigung', ar: 'الطيران والدفاع' },
  'Agri-food': { fr: 'Agroalimentaire', es: 'Agroalimentario', de: 'Agrar- und Lebensmittelwirtschaft', ar: 'الصناعات الزراعية الغذائية' },
  'Agribusiness and export': { fr: 'Agro-industrie et export', es: 'Agronegocio y exportación', de: 'Agrarwirtschaft und Export', ar: 'الأعمال الزراعية والتصدير' },
  'Automotive suppliers': { fr: 'Équipementiers automobiles', es: 'Proveedores de automoción', de: 'Automobilzulieferer', ar: 'مورّدو قطاع السيارات' },
  'Private banking and fiduciary services': { fr: 'Banque privée et services fiduciaires', es: 'Banca privada y servicios fiduciarios', de: 'Private Banking und Treuhanddienste', ar: 'الخدمات المصرفية الخاصة والخدمات الائتمانية' },
  'Banking and insurance': { fr: 'Banque et assurance', es: 'Banca y seguros', de: 'Banken und Versicherungen', ar: 'المصارف والتأمين' },
  'Biomedical and life sciences': { fr: 'Biomédical et sciences de la vie', es: 'Biomedicina y ciencias de la vida', de: 'Biomedizin und Life Sciences', ar: 'الطب الحيوي وعلوم الحياة' },
  'Maritime trade and chartering': { fr: 'Commerce maritime et affrètement', es: 'Comercio marítimo y fletamento', de: 'Seehandel und Befrachtung', ar: 'التجارة البحرية واستئجار السفن' },
  'Trade and re-export': { fr: 'Commerce et réexportation', es: 'Comercio y reexportación', de: 'Handel und Reexport', ar: 'التجارة وإعادة التصدير' },
  'Construction and civil engineering': { fr: 'Construction et génie civil', es: 'Construcción e ingeniería civil', de: 'Bau und Tiefbau', ar: 'البناء والهندسة المدنية' },
  'Construction and engineering': { fr: 'Construction et ingénierie', es: 'Construcción e ingeniería', de: 'Bau und Engineering', ar: 'البناء والهندسة' },
  'Construction and infrastructure': { fr: 'Construction et infrastructures', es: 'Construcción e infraestructuras', de: 'Bau und Infrastruktur', ar: 'البناء والبنية التحتية' },
  'Construction and public works': { fr: 'Construction et travaux publics', es: 'Construcción y obras públicas', de: 'Bau und öffentliche Bauvorhaben', ar: 'البناء والأشغال العامة' },
  Construction: { fr: 'Construction', es: 'Construcción', de: 'Bauwesen', ar: 'البناء' },
  'Construction and megaprojects': { fr: 'Construction et mégaprojets', es: 'Construcción y megaproyectos', de: 'Bau und Großprojekte', ar: 'البناء والمشاريع الكبرى' },
  'Consulting and audit': { fr: 'Conseil et audit', es: 'Consultoría y auditoría', de: 'Beratung und Prüfung', ar: 'الاستشارات والتدقيق' },
  'Accountancy and audit': { fr: 'Expertise comptable et audit', es: 'Contabilidad y auditoría', de: 'Buchhaltung und Wirtschaftsprüfung', ar: 'المحاسبة والتدقيق' },
  'Medical devices': { fr: 'Dispositifs médicaux', es: 'Dispositivos médicos', de: 'Medizinprodukte', ar: 'الأجهزة الطبية' },
  'Education and research': { fr: 'Éducation et recherche', es: 'Educación e investigación', de: 'Bildung und Forschung', ar: 'التعليم والبحث' },
  'Higher education': { fr: 'Enseignement supérieur', es: 'Educación superior', de: 'Hochschulbildung', ar: 'التعليم العالي' },
  'Electronics and automation': { fr: 'Électronique et automatisation', es: 'Electrónica y automatización', de: 'Elektronik und Automatisierung', ar: 'الإلكترونيات والأتمتة' },
  'Energy and industrial services': { fr: 'Énergie et services industriels', es: 'Energía y servicios industriales', de: 'Energie und Industriedienstleistungen', ar: 'الطاقة والخدمات الصناعية' },
  'Energy and petrochemicals': { fr: 'Énergie et pétrochimie', es: 'Energía y petroquímica', de: 'Energie und Petrochemie', ar: 'الطاقة والبتروكيماويات' },
  'Energy and pipelines': { fr: 'Énergie et pipelines', es: 'Energía y oleoductos', de: 'Energie und Pipelines', ar: 'الطاقة وخطوط الأنابيب' },
  'Energy and commodity trading': { fr: 'Négoce d\'énergie et de matières premières', es: 'Comercio de energía y materias primas', de: 'Energie- und Rohstoffhandel', ar: 'تجارة الطاقة والسلع الأساسية' },
  'Energy and infrastructure': { fr: 'Énergie et infrastructures', es: 'Energía e infraestructuras', de: 'Energie und Infrastruktur', ar: 'الطاقة والبنية التحتية' },
  'Energy and nuclear': { fr: 'Énergie et nucléaire', es: 'Energía y nuclear', de: 'Energie und Kernkraft', ar: 'الطاقة والطاقة النووية' },
  'Renewable energy': { fr: 'Énergies renouvelables', es: 'Energías renovables', de: 'Erneuerbare Energien', ar: 'الطاقة المتجددة' },
  'Energy and utilities': { fr: 'Énergie et services publics', es: 'Energía y servicios públicos', de: 'Energie und Versorgung', ar: 'الطاقة والمرافق' },
  'Engineering and technical consultancy': { fr: 'Ingénierie et conseil technique', es: 'Ingeniería y consultoría técnica', de: 'Ingenieurwesen und technische Beratung', ar: 'الهندسة والاستشارات الفنية' },
  'Engineering and construction': { fr: 'Ingénierie et construction', es: 'Ingeniería y construcción', de: 'Engineering und Bau', ar: 'الهندسة والبناء' },
  'Family offices and holdings': { fr: 'Family offices et holdings', es: 'Family offices y holdings', de: 'Family Offices und Holdings', ar: 'المكاتب العائلية والشركات القابضة' },
  Pharmaceuticals: { fr: 'Pharmacie', es: 'Farmacéutica', de: 'Pharma', ar: 'الصناعات الدوائية' },
  'Pharmaceuticals and life sciences': { fr: 'Pharmacie et sciences de la vie', es: 'Farmacéutica y ciencias de la vida', de: 'Pharma und Life Sciences', ar: 'الصناعات الدوائية وعلوم الحياة' },
  'Wealth management and family offices': { fr: 'Gestion de fortune et family offices', es: 'Gestión patrimonial y family offices', de: 'Vermögensverwaltung und Family Offices', ar: 'إدارة الثروات والمكاتب العائلية' },
  'Hospitality and tourism': { fr: 'Hôtellerie et tourisme', es: 'Hostelería y turismo', de: 'Gastgewerbe und Tourismus', ar: 'الضيافة والسياحة' },
  'Real estate and asset management': { fr: 'Immobilier et gestion d\'actifs', es: 'Inmobiliario y gestión de activos', de: 'Immobilien und Asset Management', ar: 'العقارات وإدارة الأصول' },
  'Real estate and development': { fr: 'Immobilier et promotion', es: 'Inmobiliario y promoción', de: 'Immobilien und Projektentwicklung', ar: 'العقارات والتطوير العقاري' },
  'Real estate and mortgage': { fr: 'Immobilier et crédit hypothécaire', es: 'Inmobiliario e hipotecas', de: 'Immobilien und Hypotheken', ar: 'العقارات والرهن العقاري' },
  'Commercial real estate': { fr: 'Immobilier commercial', es: 'Inmobiliario comercial', de: 'Gewerbeimmobilien', ar: 'العقارات التجارية' },
  Manufacturing: { fr: 'Industrie manufacturière', es: 'Fabricación', de: 'Verarbeitendes Gewerbe', ar: 'التصنيع' },
  'Legal services': { fr: 'Services juridiques', es: 'Servicios jurídicos', de: 'Rechtsdienstleistungen', ar: 'الخدمات القانونية' },
  'Logistics and aviation': { fr: 'Logistique et aviation', es: 'Logística y aviación', de: 'Logistik und Luftfahrt', ar: 'الخدمات اللوجستية والطيران' },
  'Logistics and freight forwarding': { fr: 'Logistique et commission de transport', es: 'Logística y transitarios', de: 'Logistik und Spedition', ar: 'الخدمات اللوجستية وشحن البضائع' },
  'Logistics and ports': { fr: 'Logistique et ports', es: 'Logística y puertos', de: 'Logistik und Häfen', ar: 'الخدمات اللوجستية والموانئ' },
  'Logistics and shipping': { fr: 'Logistique et transport maritime', es: 'Logística y transporte marítimo', de: 'Logistik und Schifffahrt', ar: 'الخدمات اللوجستية والشحن البحري' },
  'Logistics and transport': { fr: 'Logistique et transport', es: 'Logística y transporte', de: 'Logistik und Transport', ar: 'الخدمات اللوجستية والنقل' },
  'Logistics and supply chain': { fr: 'Logistique et chaîne d\'approvisionnement', es: 'Logística y cadena de suministro', de: 'Logistik und Lieferkette', ar: 'الخدمات اللوجستية وسلاسل الإمداد' },
  'Logistics and transportation': { fr: 'Logistique et transport', es: 'Logística y transporte', de: 'Logistik und Transportwesen', ar: 'الخدمات اللوجستية والنقل' },
  'Luxury and retail': { fr: 'Luxe et commerce de détail', es: 'Lujo y comercio minorista', de: 'Luxus und Einzelhandel', ar: 'السلع الفاخرة وتجارة التجزئة' },
  'Machinery and capital goods': { fr: 'Machines et biens d\'équipement', es: 'Maquinaria y bienes de equipo', de: 'Maschinen und Investitionsgüter', ar: 'الآلات والسلع الرأسمالية' },
  'Precision machinery and watchmaking': { fr: 'Mécanique de précision et horlogerie', es: 'Maquinaria de precisión y relojería', de: 'Präzisionsmaschinen und Uhrenindustrie', ar: 'الآلات الدقيقة وصناعة الساعات' },
  'Mining and metals': { fr: 'Mines et métaux', es: 'Minería y metales', de: 'Bergbau und Metalle', ar: 'التعدين والمعادن' },
  'Chemicals and materials': { fr: 'Chimie et matériaux', es: 'Química y materiales', de: 'Chemie und Werkstoffe', ar: 'الكيماويات والمواد' },
  'Specialty chemicals': { fr: 'Chimie de spécialités', es: 'Química de especialidades', de: 'Spezialchemie', ar: 'الكيماويات المتخصصة' },
  'Natural resources and mining': { fr: 'Ressources naturelles et mines', es: 'Recursos naturales y minería', de: 'Rohstoffe und Bergbau', ar: 'الموارد الطبيعية والتعدين' },
  'Healthcare and life sciences': { fr: 'Santé et sciences de la vie', es: 'Salud y ciencias de la vida', de: 'Gesundheitswesen und Life Sciences', ar: 'الرعاية الصحية وعلوم الحياة' },
  Healthcare: { fr: 'Santé', es: 'Salud', de: 'Gesundheitswesen', ar: 'الرعاية الصحية' },
  'Private healthcare': { fr: 'Santé privée', es: 'Sanidad privada', de: 'Private Gesundheitsversorgung', ar: 'الرعاية الصحية الخاصة' },
  'Healthcare and medical billing': { fr: 'Santé et facturation médicale', es: 'Salud y facturación médica', de: 'Gesundheitswesen und medizinische Abrechnung', ar: 'الرعاية الصحية والفوترة الطبية' },
  'Industrial insurance': { fr: 'Assurance industrielle', es: 'Seguros industriales', de: 'Industrieversicherung', ar: 'التأمين الصناعي' },
  'Insurance and broking': { fr: 'Assurance et courtage', es: 'Seguros y correduría', de: 'Versicherung und Maklerwesen', ar: 'التأمين والوساطة' },
  Insurance: { fr: 'Assurance', es: 'Seguros', de: 'Versicherungen', ar: 'التأمين' },
  'Insurance and reinsurance': { fr: 'Assurance et réassurance', es: 'Seguros y reaseguros', de: 'Versicherung und Rückversicherung', ar: 'التأمين وإعادة التأمين' },
  'Financial services and fintech': { fr: 'Services financiers et fintech', es: 'Servicios financieros y fintech', de: 'Finanzdienstleistungen und Fintech', ar: 'الخدمات المالية والتقنية المالية' },
  'Financial services': { fr: 'Services financiers', es: 'Servicios financieros', de: 'Finanzdienstleistungen', ar: 'الخدمات المالية' },
  'Professional services': { fr: 'Services professionnels', es: 'Servicios profesionales', de: 'Professionelle Dienstleistungen', ar: 'الخدمات المهنية' },
  'Technology and software': { fr: 'Technologie et logiciels', es: 'Tecnología y software', de: 'Technologie und Software', ar: 'التكنولوجيا والبرمجيات' },
  'Enterprise technology': { fr: 'Technologies d\'entreprise', es: 'Tecnología empresarial', de: 'Unternehmenstechnologie', ar: 'تقنيات المؤسسات' },
  Telecommunications: { fr: 'Télécommunications', es: 'Telecomunicaciones', de: 'Telekommunikation', ar: 'الاتصالات' },
  'Transport and logistics': { fr: 'Transport et logistique', es: 'Transporte y logística', de: 'Transport und Logistik', ar: 'النقل والخدمات اللوجستية' },
};

/** As faixas de investimento: só as palavras mudam; montantes e moedas ficam como estão. */
const FAIXA: Readonly<Record<Extra, { ate: string; acima: string; indefinido: string }>> = {
  fr: { ate: "Jusqu'à", acima: 'Plus de', indefinido: 'Pas encore défini' },
  es: { ate: 'Hasta', acima: 'Más de', indefinido: 'Aún por definir' },
  de: { ate: 'Bis', acima: 'Über', indefinido: 'Noch nicht festgelegt' },
  ar: { ate: 'حتى', acima: 'أكثر من', indefinido: 'لم يُحدَّد بعد' },
};

export function traduzirFaixa(rotuloIngles: string, lingua: Lingua): string {
  if (lingua === 'pt' || lingua === 'en') return rotuloIngles;
  const f = FAIXA[lingua];
  if (rotuloIngles === 'Not yet defined') return f.indefinido;
  if (rotuloIngles.startsWith('Up to ')) return `${f.ate} ${rotuloIngles.slice(6)}`;
  if (rotuloIngles.startsWith('Over ')) return `${f.acima} ${rotuloIngles.slice(5)}`;
  return rotuloIngles; // «EUR 5,000 – 15,000»: só montantes.
}

/**
 * Nas quatro línguas de leitura, o texto de consentimento aparece em inglês:
 * é a versão que o servidor guarda com o pedido, e o consentimento registado
 * tem de ser o que a pessoa leu. Esta nota di-lo antes da caixa.
 */
export const CONSENTIMENTO_LINGUA: Texto = {
  pt: 'O texto de consentimento está em português: é a versão registada com o seu pedido.',
  en: 'The consent text is in English: it is the version recorded with your request.',
  fr: "Le texte de consentement ci-dessous est en anglais : c'est la version enregistrée avec votre demande.",
  es: 'El texto de consentimiento aparece en inglés: es la versión que queda registrada con su solicitud.',
  de: 'Der Einwilligungstext ist auf Englisch: Diese Fassung wird mit Ihrer Anfrage gespeichert.',
  ar: 'نص الموافقة أدناه باللغة الإنجليزية، وهي النسخة التي تُسجَّل مع طلبكم.',
};
