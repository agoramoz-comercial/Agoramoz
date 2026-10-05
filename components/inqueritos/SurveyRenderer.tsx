'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { inputClass } from '@/components/form/Field';
import { Button } from '@/components/ui/Button';
import { INQ } from '@/content/i18n/inquerito';
import type { Idioma, Texto } from '@/content/types';
import { track } from '@/lib/analytics/track';
import { t } from '@/lib/i18n/texto';
import {
  cartoesDe,
  erroDoCartao,
  montarEnvio,
  primeiroComErro,
  respostasValidas,
  type DadosContacto,
  type ErroCartao,
  type Rascunho,
  type ValorRascunho,
} from '@/lib/inqueritos/cartoes';
import { chaveDoRascunho, lerRascunho, serializarRascunho } from '@/lib/inqueritos/rascunho';
import { validarResposta } from '@/lib/inqueritos/respostas';
import { minutosRestantes } from '@/lib/inqueritos/ritmo';
import type { CampoContacto, Pergunta, SpecInquerito } from '@/lib/inqueritos/spec';
import { acaoDaTecla, letraDe } from '@/lib/inqueritos/teclas';
import { cn } from '@/lib/utils/cn';
import { EstadoInquerito } from './EstadoInquerito';
import { BORDA_CONTROLO, Escala, EscolhaMultipla, EscolhaUnica } from './partes/Escolhas';
import { Progresso } from './partes/Progresso';

/**
 * Quem responde a um inquérito: boas-vindas → uma pergunta de cada vez →
 * agradecimento. O mesmo componente serve a página pública (`modo
 * 'publico'`, em palco de ecrã inteiro) e a pré-visualização do construtor no
 * admin (`'previa'`, compacta, que não envia, não mede e não guarda nada).
 *
 * O que o torna rápido de responder, sem custar acessibilidade:
 * - letras (A, B, C…) e dígitos escolhem; Enter segue; setas no título
 *   avançam e recuam; no telemóvel, deslizar faz o mesmo e as acções ficam
 *   numa barra fixa ao alcance do polegar;
 * - um rascunho em `sessionStorage` (sem contacto) sobrevive a um recarregar;
 * - o foco segue sempre a pergunta nova, e o passo vai dentro do seu título.
 *
 * Todo o texto vem do spec e é mostrado como texto — o React escapa-o, e não
 * há `dangerouslySetInnerHTML` aqui. A validação de cada cartão é a mesma
 * função que o servidor usa (`lib/inqueritos/cartoes.ts`), mas o servidor
 * valida tudo de novo: o browser só poupa uma ida e volta.
 */

type Props =
  | { modo: 'publico'; spec: SpecInquerito; inqueritoId: string; token: string }
  | { modo: 'previa'; spec: SpecInquerito; inqueritoId?: string; token?: undefined };

type Fase = 'inicio' | 'cartoes' | 'fim' | 'fechado';
type Envio = 'idle' | 'enviando' | 'erro' | 'limite';

/** O suficiente para ver a escolha marcada antes de o cartão mudar. */
const PAUSA_MS = 260;
/**
 * NPS por teclado: «1» pode ser o início de «10». Espera-se um pouco mais
 * antes de avançar, e um «0» dentro desta janela faz 10 — nunca 0, que seria
 * o contrário do que a pessoa quis dizer.
 */
const JANELA_DEZ_MS = 700;
const AUTOMATICOS = new Set<Pergunta['tipo']>(['escolha_unica', 'avaliacao', 'nps']);
/** Deslize mínimo, em px, para contar como gesto (o mesmo do diagnóstico). */
const DESLIZE_PX = 60;

const ROTULO_CAMPO: Record<CampoContacto, Texto> = {
  nome: INQ.campoNome,
  email: INQ.campoEmail,
  telefone: INQ.campoTelefone,
  organizacao: INQ.campoOrganizacao,
};
const TIPO_CAMPO: Record<CampoContacto, { type: string; autoComplete: string }> = {
  nome: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  telefone: { type: 'tel', autoComplete: 'tel' },
  organizacao: { type: 'text', autoComplete: 'organization' },
};

const dois = (n: number) => String(n).padStart(2, '0');

function preencher(texto: Texto, idioma: Idioma, valores: Record<string, string | number>) {
  return Object.entries(valores).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    t(texto, idioma),
  );
}

/** A regra que a pessoa precisa de conhecer antes de responder, ou nada. */
function dicaDe(p: Pergunta, idioma: Idioma): string | null {
  switch (p.tipo) {
    case 'escolha_multipla': {
      const min = p.min ?? 1;
      if (p.max !== undefined && min > 1)
        return preencher(INQ.escolhaEntre, idioma, { min, max: p.max });
      if (p.max !== undefined) return preencher(INQ.escolhaMax, idioma, { max: p.max });
      return min > 1 ? preencher(INQ.escolhaMin, idioma, { min }) : null;
    }
    case 'numero': {
      const partes: string[] = [];
      if (p.min !== undefined && p.max !== undefined)
        partes.push(preencher(INQ.numeroEntre, idioma, { min: p.min, max: p.max }));
      else if (p.min !== undefined) partes.push(preencher(INQ.numeroMin, idioma, { min: p.min }));
      else if (p.max !== undefined) partes.push(preencher(INQ.numeroMax, idioma, { max: p.max }));
      if (p.inteiro) partes.push(t(INQ.numeroInteiro, idioma));
      return partes.length > 0 ? partes.join(' ') : null;
    }
    default:
      return null;
  }
}

/** O atalho de teclado da pergunta, para quem tem teclado e rato — ou nada. */
function atalhoDe(p: Pergunta, idioma: Idioma, ultimo: boolean): string | null {
  switch (p.tipo) {
    case 'escolha_unica':
    case 'escolha_multipla':
      return preencher(INQ.teclasOpcoes, idioma, {
        de: letraDe(0),
        ate: letraDe(p.opcoes.length - 1),
      });
    case 'avaliacao':
      return preencher(INQ.teclasOpcoes, idioma, { de: 1, ate: 5 });
    case 'nps':
      return preencher(INQ.teclasOpcoes, idioma, { de: 0, ate: 10 });
    case 'texto_longo':
      return ultimo ? null : t(INQ.teclaCtrlEnter, idioma);
    default:
      return null;
  }
}

/**
 * O id da submissão (UUID v4). `crypto.randomUUID` falta em origens não
 * seguras e em Safari anterior a 15.4; `getRandomValues` existe em todos.
 */
function novoIdDeSubmissao(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function mensagemDeErro(p: Pergunta, erro: ErroCartao, idioma: Idioma): string {
  if (erro === 'obrigatoria') return t(INQ.obrigatoria, idioma);
  if (p.tipo === 'texto_curto' || p.tipo === 'texto_longo')
    return preencher(INQ.textoLongo, idioma, { max: p.max });
  if (p.tipo === 'data') return t(INQ.dataFormato, idioma);
  return dicaDe(p, idioma) ?? t(INQ.invalida, idioma);
}

/**
 * O rascunho guardado, lido como loja externa: no servidor não há
 * `sessionStorage` (snapshot nulo), e no browser lê-se sem efeito nem
 * segundo render. Outros separadores avisam por `storage`; este, ao
 * descartar, pelo evento próprio.
 */
const EVENTO_RASCUNHO = 'agoraforms:rascunho';

function subscreverRascunho(aviso: () => void) {
  window.addEventListener('storage', aviso);
  window.addEventListener(EVENTO_RASCUNHO, aviso);
  return () => {
    window.removeEventListener('storage', aviso);
    window.removeEventListener(EVENTO_RASCUNHO, aviso);
  };
}

function lerArmazenado(chave: string | null): string | null {
  if (!chave) return null;
  try {
    return sessionStorage.getItem(chave);
  } catch {
    // Sem armazenamento (janela privada, cookies bloqueados): sem rascunho.
    return null;
  }
}

/** Campos onde uma letra é texto e não um atalho. */
function escreveTexto(alvo: EventTarget): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.closest('textarea, select, [contenteditable="true"]')) return true;
  return alvo instanceof HTMLInputElement && alvo.type !== 'checkbox' && alvo.type !== 'radio';
}

export function SurveyRenderer(props: Props) {
  const { spec, modo } = props;
  const idioma = spec.idioma;
  const base = useId();
  /** Público: palco de ecrã inteiro, com o h1 da página. Prévia: compacta, sem títulos de página. */
  const palco = modo === 'publico';
  const TituloPagina = palco ? 'h1' : 'p';

  const [fase, setFase] = useState<Fase>('inicio');
  const [estadoFechado, setEstadoFechado] = useState<'fechado' | 'expirado'>('fechado');
  const [rascunho, setRascunho] = useState<Rascunho>({});
  const rascunhoRef = useRef<Rascunho>({});
  const [indice, setIndice] = useState(0);
  const indiceRef = useRef(0);
  const [maisAvancado, setMaisAvancado] = useState(0);
  const [direcao, setDirecao] = useState<'frente' | 'tras' | null>(null);
  const [erro, setErro] = useState<ErroCartao | null>(null);
  const [pedidoFocoErro, setPedidoFocoErro] = useState(0);
  const [contacto, setContacto] = useState<DadosContacto>({});
  const [consentimento, setConsentimento] = useState(false);
  const [errosContacto, setErrosContacto] = useState<ReadonlySet<string>>(new Set());
  const [envio, setEnvio] = useState<Envio>('idle');
  /** Guarda síncrona: dois cliques antes do novo render não fazem dois pedidos. */
  const aEnviar = useRef(false);
  const [fax, setFax] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fimRef = useRef<HTMLHeadingElement>(null);
  const fechadoRef = useRef<HTMLHeadingElement>(null);
  const erroRef = useRef<HTMLElement>(null);
  /** O que um leitor de ecrã ouve ao escolher ou descartar (role="status"). */
  const [anuncio, setAnuncio] = useState('');
  const focarComecar = useRef(false);
  const focarAoMudar = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vistos = useRef(new Set<number>());
  const toque = useRef<{ x: number; y: number } | null>(null);
  /** Quando se premiu «1» num NPS (ver JANELA_DEZ_MS), ou nulo. */
  const umPremido = useRef<number | null>(null);
  /** Um por submissão, criado no primeiro envio: repetir o envio não duplica a resposta. */
  const submissionId = useRef<string | null>(null);

  const cartoes = useMemo(() => cartoesDe(spec, rascunho), [spec, rascunho]);
  const total = cartoes.length;
  const cartao = cartoes[Math.min(indice, total - 1)]!;
  const p = cartao.tipo === 'pergunta' ? cartao.pergunta : null;
  const ultimo = indice >= total - 1;

  const medir = modo === 'publico';
  const surveyId = props.inqueritoId;
  /** Só a página pública guarda rascunho; a prévia do construtor nunca. */
  const chaveRascunho = useMemo(
    () => (modo === 'publico' && surveyId ? chaveDoRascunho(surveyId, spec) : null),
    [modo, surveyId, spec],
  );

  const textoGuardado = useSyncExternalStore(
    subscreverRascunho,
    // Só as boas-vindas oferecem retomar: fora delas, nem se lê.
    () => (fase === 'inicio' ? lerArmazenado(chaveRascunho) : null),
    () => null,
  );
  /** Só nas boas-vindas se oferece retomar; depois, o rascunho é o que se está a responder. */
  const retomavel = useMemo(
    () => (fase === 'inicio' ? lerRascunho(textoGuardado, spec) : null),
    [fase, textoGuardado, spec],
  );

  useEffect(() => {
    if (fase !== 'cartoes' || !medir || !surveyId || vistos.current.has(indice)) return;
    vistos.current.add(indice);
    track({ name: 'survey_step_viewed', surveyId, step: indice + 1 });
  }, [fase, indice, medir, surveyId]);

  useEffect(() => {
    if (focarAoMudar.current) headingRef.current?.focus();
  }, [indice, fase]);

  useEffect(() => {
    if (pedidoFocoErro > 0) erroRef.current?.focus();
  }, [pedidoFocoErro]);

  useEffect(() => {
    if (fase === 'fim') fimRef.current?.focus();
    if (fase === 'fechado') fechadoRef.current?.focus();
  }, [fase]);

  // Depois de descartar, os botões trocam: o foco vai para «Começar» em vez
  // de cair no corpo da página.
  useEffect(() => {
    if (!retomavel && focarComecar.current) {
      focarComecar.current = false;
      // O `Button` do sistema não passa `ref`; o id é estável (useId).
      document.getElementById(`${base}-comecar`)?.focus();
    }
  }, [retomavel, base]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  // Na pré-visualização do construtor o inquérito muda por baixo: se o cartão
  // actual deixou de existir, volta-se ao último que existe.
  useEffect(() => {
    if (total > 0 && indiceRef.current > total - 1) {
      indiceRef.current = total - 1;
      setIndice(total - 1);
    }
  }, [total]);

  // E uma pergunta que mudou de tipo perde a resposta de rascunho: um texto
  // antigo não serve de NPS, e um número fora da escala deixava-a sem foco.
  const tipos = useRef<Map<string, Pergunta['tipo']>>(new Map());
  useEffect(() => {
    const agora = new Map(spec.perguntas.map((q) => [q.chave, q.tipo] as const));
    const mudadas = [...agora].filter(
      ([k, tipo]) => tipos.current.has(k) && tipos.current.get(k) !== tipo,
    );
    tipos.current = agora;
    if (mudadas.length === 0) return;
    const limpo = { ...rascunhoRef.current };
    for (const [k] of mudadas) delete limpo[k];
    rascunhoRef.current = limpo;
    setRascunho(limpo);
  }, [spec.perguntas]);

  function guardarRascunho(i: number) {
    if (!chaveRascunho) return;
    try {
      sessionStorage.setItem(chaveRascunho, serializarRascunho(rascunhoRef.current, i));
    } catch {
      // Sem armazenamento, o inquérito funciona na mesma — só não retoma.
    }
  }

  function apagarRascunho() {
    if (!chaveRascunho) return;
    try {
      sessionStorage.removeItem(chaveRascunho);
    } catch {
      // Idem.
    }
  }

  function definir(chave: string, valor: ValorRascunho) {
    // Durante um envio o corpo já partiu: mudar uma resposta agora perdia-se
    // em silêncio e o agradecimento diria o contrário.
    if (aEnviar.current) return;
    rascunhoRef.current = { ...rascunhoRef.current, [chave]: valor };
    setRascunho(rascunhoRef.current);
    setErro(null);
    guardarRascunho(indiceRef.current);
  }

  const comecar = useCallback(() => {
    focarAoMudar.current = true;
    setFase('cartoes');
    if (medir && surveyId) track({ name: 'survey_started', surveyId });
  }, [medir, surveyId]);

  // «ou prima Enter»: nas boas-vindas, Enter começa — se o foco não estiver
  // noutro controlo (aí, Enter é desse controlo).
  useEffect(() => {
    if (fase !== 'inicio' || !palco || retomavel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.defaultPrevented || e.repeat) return;
      const ativo = document.activeElement;
      if (ativo && ativo !== document.body) return;
      e.preventDefault();
      comecar();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fase, palco, retomavel, comecar]);

  /** Retoma o rascunho: no cartão onde ia, ou antes, no primeiro que ficou por responder. */
  function retomar() {
    if (!retomavel) return;
    const r = retomavel.respostas;
    rascunhoRef.current = r;
    setRascunho(r);
    const atuais = cartoesDe(spec, r);
    let destino = Math.min(retomavel.indice, atuais.length - 1);
    const comErro = primeiroComErro(atuais, r);
    if (comErro >= 0 && comErro < destino) destino = comErro;
    indiceRef.current = destino;
    setIndice(destino);
    setMaisAvancado(destino);
    comecar();
  }

  function descartar() {
    focarComecar.current = true;
    apagarRascunho();
    window.dispatchEvent(new Event(EVENTO_RASCUNHO));
    setAnuncio(t(INQ.descartado, idioma));
  }

  function irPara(destino: number) {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (destino === indiceRef.current || destino < 0) return;
    focarAoMudar.current = true;
    setDirecao(destino > indiceRef.current ? 'frente' : 'tras');
    indiceRef.current = destino;
    setIndice(destino);
    setMaisAvancado((m) => Math.max(m, destino));
    setErro(null);
    // Um erro de envio é do envio, não do cartão para onde se foi.
    setEnvio((e) => (e === 'enviando' ? e : 'idle'));
    guardarRascunho(destino);
  }

  function voltar() {
    if (indiceRef.current > 0) irPara(indiceRef.current - 1);
  }

  /**
   * Valida o cartão `de` e passa ao seguinte; no último, envia. Um avanço
   * automático em espera e um clique no mesmo instante não saltam dois
   * cartões, e o automático nunca envia.
   */
  function avancar(de = indiceRef.current, automatico = false) {
    if (de !== indiceRef.current) return;
    const atuais = cartoesDe(spec, rascunhoRef.current);
    const c = atuais[de];
    if (!c) return;
    if (c.tipo === 'pergunta') {
      const e = erroDoCartao(c.pergunta, rascunhoRef.current[c.pergunta.chave]);
      if (e) {
        setErro(e);
        setPedidoFocoErro((n) => n + 1);
        return;
      }
    }
    if (de >= atuais.length - 1) {
      if (!automatico) void enviar();
      return;
    }
    irPara(de + 1);
  }

  /** Um segmento do progresso: para trás vai sempre; para a frente, só sem obrigatórias por responder pelo caminho. */
  function irParaSegmento(destino: number) {
    if (destino <= indiceRef.current) {
      irPara(destino);
      return;
    }
    const atuais = cartoesDe(spec, rascunhoRef.current);
    for (let j = indiceRef.current; j < destino; j++) {
      const c = atuais[j];
      if (c?.tipo !== 'pergunta') continue;
      const e = erroDoCartao(c.pergunta, rascunhoRef.current[c.pergunta.chave]);
      if (e) {
        irPara(j);
        setErro(e);
        setPedidoFocoErro((n) => n + 1);
        return;
      }
    }
    irPara(destino);
  }

  function escolher(chave: string, valor: ValorRascunho, pausa = PAUSA_MS) {
    if (aEnviar.current) return;
    definir(chave, valor);
    // O cartão muda daqui a nada e leva o foco: sem isto, quem usa leitor de
    // ecrã nunca ouvia o que ficou escolhido.
    const q = spec.perguntas.find((x) => x.chave === chave);
    const rotulo =
      q && 'opcoes' in q ? (q.opcoes.find((o) => o.chave === valor)?.rotulo ?? '') : String(valor);
    setAnuncio(preencher(INQ.escolheu, idioma, { valor: rotulo }));
    if (temporizador.current) clearTimeout(temporizador.current);
    const de = indiceRef.current;
    temporizador.current = setTimeout(() => avancar(de, true), pausa);
  }

  async function enviar() {
    if (aEnviar.current) return;
    const r = rascunhoRef.current;
    const atuais = cartoesDe(spec, r);
    const comErro = primeiroComErro(atuais, r);
    if (comErro >= 0) {
      const c = atuais[comErro];
      irPara(comErro);
      if (c?.tipo === 'pergunta') setErro(erroDoCartao(c.pergunta, r[c.pergunta.chave]));
      setPedidoFocoErro((n) => n + 1);
      return;
    }

    const corpo = montarEnvio(spec, r, contacto, consentimento);
    const validacao = validarResposta(spec, corpo);
    if (!validacao.ok) {
      const doContacto = new Set(
        validacao.erros.filter((e) => e.chave.startsWith('contacto')).map((e) => e.chave),
      );
      setErrosContacto(doContacto);
      if (doContacto.size > 0) {
        irPara(atuais.length - 1);
        setPedidoFocoErro((n) => n + 1);
        return;
      }
    }
    setErrosContacto(new Set());

    if (props.modo === 'previa') {
      setFase('fim');
      return;
    }

    aEnviar.current = true;
    setEnvio('enviando');
    try {
      submissionId.current ??= novoIdDeSubmissao();
      const res = await fetch('/api/inqueritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: props.token,
          submissionId: submissionId.current,
          ...corpo,
          ...(fax ? { fax } : {}),
        }),
      });
      if (res.status === 200 || res.status === 202) {
        apagarRascunho();
        setEnvio('idle');
        setFase('fim');
        return;
      }
      if (res.status === 410 || res.status === 404) {
        const dados = (await res.json().catch(() => null)) as { estado?: string } | null;
        apagarRascunho();
        setEstadoFechado(dados?.estado === 'expirado' ? 'expirado' : 'fechado');
        setEnvio('idle');
        setFase('fechado');
        return;
      }
      setEnvio(res.status === 429 ? 'limite' : 'erro');
    } catch {
      setEnvio('erro');
    } finally {
      aEnviar.current = false;
    }
  }

  function recomecar() {
    rascunhoRef.current = {};
    setRascunho({});
    setContacto({});
    setConsentimento(false);
    setErrosContacto(new Set());
    indiceRef.current = 0;
    setIndice(0);
    setMaisAvancado(0);
    setDirecao(null);
    focarAoMudar.current = false;
    setFase('inicio');
  }

  function onKeyDownTitulo(e: React.KeyboardEvent) {
    // Uma tecla mantida premida não pode saltar cartões em série; e Alt+← (o
    // «voltar» do browser), Cmd+→ e afins pertencem ao browser.
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    // Como avanço automático: no último cartão valida mas nunca envia —
    // enviar é sempre um gesto explícito no botão.
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      avancar(indiceRef.current, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      voltar();
    }
  }

  /** Letras escolhem opções; dígitos, valores da escala. Nunca dentro de um campo de texto. */
  function onKeyDownFormulario(e: React.KeyboardEvent) {
    if (!p || e.defaultPrevented || escreveTexto(e.target)) return;
    const acao = acaoDaTecla(p, e);
    if (!acao) return;
    e.preventDefault();
    // Mantida premida, uma letra marcava e desmarcava sem parar.
    if (e.repeat) return;
    if (acao.tipo === 'valor') {
      if (p.tipo === 'nps') {
        const um = umPremido.current;
        umPremido.current = null;
        if (acao.valor === 0 && um !== null && e.timeStamp - um < JANELA_DEZ_MS) {
          escolher(p.chave, 10);
          return;
        }
        if (acao.valor === 1) {
          umPremido.current = e.timeStamp;
          escolher(p.chave, 1, JANELA_DEZ_MS);
          return;
        }
      }
      escolher(p.chave, acao.valor);
      return;
    }
    if (p.tipo === 'escolha_unica') {
      escolher(p.chave, p.opcoes[acao.indice]!.chave);
    } else if (p.tipo === 'escolha_multipla') {
      const atual = rascunhoRef.current[p.chave];
      const lista: readonly string[] = Array.isArray(atual) ? atual : [];
      const k = p.opcoes[acao.indice]!.chave;
      definir(p.chave, lista.includes(k) ? lista.filter((x) => x !== k) : [...lista, k]);
    }
  }

  /** Deslizar no telemóvel: para a esquerda avança (nunca envia), para a direita volta. */
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    toque.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent) {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio) return;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.abs(dx) < DESLIZE_PX || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if (dx < 0) avancar(indiceRef.current, true);
    else voltar();
  }

  const aviso =
    modo === 'previa' ? (
      <p className="mb-4 border border-dashed border-[color:var(--border)] px-4 py-2 text-[length:var(--text-micro)] text-[color:var(--muted)]">
        {t(INQ.previa, idioma)}
      </p>
    ) : null;

  /** Fora das boas-vindas, o h1 da página fica, discreto, por cima. */
  const tituloCompacto = palco ? (
    <TituloPagina className="rule-label min-w-0 break-words text-[color:var(--muted)]">
      {spec.boasVindas.titulo}
    </TituloPagina>
  ) : null;

  // ── Fechado a meio (revogado ou tecto atingido entre abrir e enviar) ──────
  if (fase === 'fechado') {
    return (
      <div className={cn(palco && 'flex flex-1 flex-col')}>
        {tituloCompacto}
        <EstadoInquerito estado={estadoFechado} idioma={idioma} nivel="h2" tituloRef={fechadoRef} />
      </div>
    );
  }

  // ── Agradecimento ──────────────────────────────────────────────────────────
  if (fase === 'fim') {
    const n = Object.keys(respostasValidas(spec, rascunho)).length;
    return (
      <div className={cn(palco && 'flex flex-1 flex-col')}>
        {aviso}
        {tituloCompacto}
        <div
          role="status"
          className={cn(
            palco
              ? 'flex flex-1 flex-col justify-center py-10'
              : 'border border-[color:var(--border)] p-5',
          )}
        >
          <span
            aria-hidden
            className="grid size-14 place-items-center border border-[color:var(--on-surface)]"
          >
            <Check className="size-7" />
          </span>
          <h2
            ref={fimRef}
            tabIndex={-1}
            className={cn(
              'mt-6 max-w-[24ch] font-display font-bold text-balance outline-none',
              palco ? 'pergunta-titulo' : 'pergunta-titulo-compacto',
            )}
          >
            {spec.agradecimento.titulo}
          </h2>
          {spec.agradecimento.corpo && (
            <p className="mt-4 max-w-[56ch] whitespace-pre-line text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {spec.agradecimento.corpo}
            </p>
          )}
          <p className="rule rule-label mt-8 max-w-xl pt-4 text-[color:var(--muted)]">
            {n === 1 ? t(INQ.respondeuUma, idioma) : preencher(INQ.respondeu, idioma, { n })}
            {palco && <> · {t(INQ.podeFechar, idioma)}</>}
          </p>
          {modo === 'previa' && (
            <Button type="button" variant="outline" size="sm" className="mt-6 self-start" onClick={recomecar}>
              {t(INQ.recomecar, idioma)}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Boas-vindas ────────────────────────────────────────────────────────────
  if (fase === 'inicio') {
    return (
      <div className={cn(palco && 'flex flex-1 flex-col justify-center py-6 sm:py-10')}>
        {aviso}
        <p className="rule-label text-[color:var(--muted)]">
          {t(INQ.metaTitulo, idioma)} ·{' '}
          {preencher(INQ.minutos, idioma, { min: minutosRestantes(cartoes) })}
        </p>
        <TituloPagina
          className={cn(
            'chrome-text mt-4 max-w-[22ch] font-display font-bold text-balance',
            palco
              ? 'text-[length:var(--text-h2)] leading-[var(--leading-display)] tracking-[var(--tracking-display)]'
              : 'pergunta-titulo-compacto',
          )}
        >
          {spec.boasVindas.titulo}
        </TituloPagina>
        {spec.boasVindas.corpo && (
          <p className="mt-6 max-w-[56ch] whitespace-pre-line text-[length:var(--text-lead)] text-[color:var(--muted)]">
            {spec.boasVindas.corpo}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          {retomavel ? (
            <>
              <Button type="button" size={palco ? 'lg' : 'md'} className="gap-2" onClick={retomar}>
                {t(INQ.retomar, idioma)}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={descartar}>
                {t(INQ.descartar, idioma)}
              </Button>
            </>
          ) : (
            <>
              <Button
                id={`${base}-comecar`}
                type="button"
                size={palco ? 'lg' : 'md'}
                className="gap-2"
                onClick={comecar}
              >
                {t(INQ.comecar, idioma)}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
              {palco && (
                <span
                  aria-hidden
                  className="hidden text-sm text-[color:var(--muted)] pointer-fine:inline"
                >
                  {t(INQ.teclaEnter, idioma)}
                </span>
              )}
            </>
          )}
        </div>
        {retomavel && (
          <p className="mt-3 max-w-[56ch] text-sm text-[color:var(--muted)]">
            {t(INQ.rascunhoGuardado, idioma)}
          </p>
        )}
        <p role="status" className="sr-only">
          {anuncio}
        </p>
        <p className="rule mt-10 max-w-xl pt-4 text-sm text-[color:var(--muted)]">
          {t(spec.contacto ? INQ.contactoOpcional : INQ.semDados, idioma)}
        </p>
      </div>
    );
  }

  // ── Cartões ────────────────────────────────────────────────────────────────
  const tituloId = `${base}-titulo`;
  const ajudaId = `${base}-ajuda`;
  const dicaId = `${base}-dica`;
  const avisoId = `${base}-auto`;
  const erroId = `${base}-erro`;
  const passo = preencher(INQ.passo, idioma, { n: indice + 1, total });
  const dica = p ? dicaDe(p, idioma) : null;
  const atalho = p ? atalhoDe(p, idioma, ultimo) : null;
  const automatico = p !== null && AUTOMATICOS.has(p.tipo) && !ultimo;
  const descritores =
    [
      p?.ajuda ? ajudaId : null,
      dica ? dicaId : null,
      automatico ? avisoId : null,
      erro ? erroId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
  const bruto = p ? rascunho[p.chave] : undefined;
  const titulos = cartoes.map((c) =>
    c.tipo === 'pergunta' ? c.pergunta.titulo : t(INQ.contactoTitulo, idioma),
  );

  return (
    <div className={cn(palco && 'flex flex-1 flex-col')}>
      {aviso}
      {tituloCompacto}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          avancar();
        }}
        onKeyDown={onKeyDownFormulario}
        className={cn(
          'flex flex-col',
          palco ? 'mt-4 flex-1' : 'border border-[color:var(--border)] p-5',
        )}
      >
        <Progresso
          total={total}
          indice={indice}
          maisAvancado={Math.min(maisAvancado, total - 1)}
          titulos={titulos}
          minutos={minutosRestantes(cartoes, indice)}
          idioma={idioma}
          onIr={irParaSegmento}
        />

        <div
          key={indice}
          data-pergunta={direcao ?? undefined}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (toque.current = null)}
          // pinch-zoom: deslizar na horizontal é nosso, ampliar continua a ser de quem lê.
          style={{ touchAction: 'pan-y pinch-zoom' }}
          className={cn(palco ? 'flex flex-1 flex-col justify-center py-8 sm:py-12' : 'pt-6')}
        >
          <p
            aria-hidden
            className="flex items-center gap-2 text-[color:var(--accent)]"
          >
            <span className={cn('numeral', palco ? 'text-[1.75rem]' : 'text-xl')}>
              {dois(indice + 1)}
            </span>
            <ArrowRight className="size-4" />
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            onKeyDown={onKeyDownTitulo}
            className={cn(
              'mt-3 max-w-[32ch] font-display font-semibold text-balance outline-none',
              palco ? 'pergunta-titulo' : 'pergunta-titulo-compacto',
            )}
          >
            <span className="sr-only">{passo}. </span>
            {/* Só o título: é o nome acessível dos campos (aria-labelledby). */}
            <span id={tituloId}>{p ? p.titulo : t(INQ.contactoTitulo, idioma)}</span>
            {p && p.tipo !== 'seccao' && p.obrigatoria && (
              <span className="ml-1 text-[color:var(--accent)]" aria-hidden>
                *
              </span>
            )}
          </h2>
          {p?.ajuda && (
            <p
              id={ajudaId}
              className="mt-3 max-w-[60ch] whitespace-pre-line text-[length:var(--text-lead)] text-[color:var(--muted)]"
            >
              {p.ajuda}
            </p>
          )}
          {!p && (
            <p className="mt-3 max-w-[60ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {t(INQ.contactoCorpo, idioma)}
            </p>
          )}
          {dica && (
            <p id={dicaId} className="mt-2 text-sm text-[color:var(--muted)]">
              {dica}
            </p>
          )}
          {automatico && (
            <p
              id={avisoId}
              className="mt-2 text-sm text-[color:var(--muted)]"
            >
              {t(INQ.avancaSozinho, idioma)}
            </p>
          )}

          {p && erro && (
            <div
              ref={erroRef as React.RefObject<HTMLDivElement | null>}
              tabIndex={-1}
              role="alert"
              id={erroId}
              className="mt-5 max-w-xl border border-[color:var(--color-signal-600)] p-4 text-sm outline-none"
            >
              {mensagemDeErro(p, erro, idioma)}
            </div>
          )}

          <div className="mt-8">
            {p && (
              <Entrada
                pergunta={p}
                valor={bruto}
                idioma={idioma}
                palco={palco}
                tituloId={tituloId}
                descritores={descritores}
                invalida={erro !== null}
                onMudar={(v) => definir(p.chave, v)}
                onEscolher={(v) => escolher(p.chave, v)}
                textoObrigatoria={t(INQ.obrigatoriaSr, idioma)}
                onSeguir={() => avancar(indiceRef.current, true)}
              />
            )}
            {!p && spec.contacto && (
              <BlocoContacto
                campos={spec.contacto.campos}
                textoConsentimento={spec.contacto.textoConsentimento}
                idioma={idioma}
                base={base}
                valores={contacto}
                consentimento={consentimento}
                erros={errosContacto}
                erroRef={erroRef}
                onCampo={(c, v) => {
                  setContacto((atual) => ({ ...atual, [c]: v }));
                  setErrosContacto(new Set());
                }}
                onConsentimento={(v) => {
                  setConsentimento(v);
                  setErrosContacto(new Set());
                }}
              />
            )}
          </div>

          {atalho && (
            <p
              aria-hidden
              className="mt-4 hidden font-techno text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--muted)] uppercase pointer-fine:block"
            >
              {atalho}
            </p>
          )}
        </div>

        {/* Armadilha — escondida de pessoas e de leitores de ecrã. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${base}-fax`}>Fax</label>
          <input
            id={`${base}-fax`}
            tabIndex={-1}
            autoComplete="off"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
          />
        </div>

        <p role="status" className="sr-only">
          {envio === 'enviando' ? t(INQ.aEnviar, idioma) : anuncio}
        </p>

        {(envio === 'erro' || envio === 'limite') && (
          <p role="alert" className="mt-6 border border-[color:var(--color-signal-600)] p-4 text-sm">
            {t(envio === 'limite' ? INQ.limite : INQ.erroEnvio, idioma)}
          </p>
        )}

        {/* Acções. No telemóvel, uma barra fixa ao alcance do polegar, acima
            da zona segura do iPhone; a partir de `sm`, em linha. Um só par de
            botões — nunca dois «Continuar» na mesma página. */}
        <div
          data-barra-acoes={palco ? '' : undefined}
          className={cn(
            'flex items-center justify-between gap-3',
            palco
              ? 'sticky bottom-0 z-10 -mx-4 mt-6 border-t border-[color:var(--hairline)] bg-[color:var(--surface)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0'
              : 'mt-6',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={indice === 0}
            onClick={voltar}
            className="gap-1.5"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t(INQ.voltar, idioma)}
          </Button>
          <div className="flex items-center gap-4">
            {palco && (
              <span
                aria-hidden
                className="hidden font-techno text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--muted)] uppercase pointer-fine:sm:inline"
              >
                Enter ↵
              </span>
            )}
            {ultimo ? (
              // Chaves distintas: sem elas o React reaproveita o botão «Continuar»
              // (fundo claro) e a transição de cor mostra texto branco sobre claro.
              <Button key="enviar" type="submit" disabled={envio === 'enviando'} className="gap-1.5">
                {envio === 'enviando' && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
                {t(envio === 'enviando' ? INQ.aEnviar : INQ.enviar, idioma)}
              </Button>
            ) : (
              <Button key="continuar" type="submit" variant="solid" className="gap-1.5">
                {t(INQ.continuar, idioma)}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Entradas por tipo ────────────────────────────────────────────────────────

function Entrada({
  pergunta: p,
  valor,
  idioma,
  palco,
  tituloId,
  descritores,
  invalida,
  onMudar,
  onEscolher,
  onSeguir,
  textoObrigatoria,
}: {
  pergunta: Pergunta;
  valor: ValorRascunho | undefined;
  idioma: Idioma;
  palco: boolean;
  tituloId: string;
  descritores: string | undefined;
  invalida: boolean;
  onMudar: (v: ValorRascunho) => void;
  onEscolher: (v: ValorRascunho) => void;
  onSeguir: () => void;
  textoObrigatoria: string;
}) {
  const texto = typeof valor === 'string' ? valor : '';
  const comum = {
    'aria-labelledby': tituloId,
    'aria-describedby': descritores,
    'aria-invalid': invalida || undefined,
    'aria-required': p.tipo !== 'seccao' && p.obrigatoria ? true : undefined,
  } as const;
  /** No palco, os campos têm a escala da pergunta: lê-se o que se escreve. */
  const campo = cn(inputClass, BORDA_CONTROLO, palco && 'min-h-13 text-lg');

  switch (p.tipo) {
    case 'seccao':
      return null;
    case 'texto_curto':
      return (
        <input
          type="text"
          className={cn(campo, 'max-w-xl')}
          maxLength={p.max}
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'texto_longo':
      return (
        <div className="max-w-2xl">
          <textarea
            rows={5}
            className={cn(campo, 'min-h-32 resize-y')}
            maxLength={p.max}
            value={texto}
            onChange={(e) => onMudar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSeguir();
              }
            }}
            {...comum}
          />
          <p
            aria-hidden
            className="mt-1.5 text-right text-[length:var(--text-micro)] text-[color:var(--muted)] tabular-nums"
          >
            {preencher(INQ.caracteres, idioma, { n: texto.length, max: p.max })}
          </p>
        </div>
      );
    case 'numero':
      return (
        <input
          type="text"
          inputMode={p.inteiro ? 'numeric' : 'decimal'}
          className={cn(campo, 'max-w-60 tabular-nums')}
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'data':
      return (
        <input
          type="date"
          className={cn(campo, 'max-w-60')}
          min="1900-01-01"
          max="2100-12-31"
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'escolha_unica':
      return (
        <EscolhaUnica
          opcoes={p.opcoes}
          valor={typeof valor === 'string' ? valor : null}
          tituloId={tituloId}
          descritores={descritores}
          obrigatoria={p.obrigatoria}
          invalida={invalida}
          onMudar={(v) => onMudar(v)}
          onEscolher={(v) => onEscolher(v)}
        />
      );
    case 'escolha_multipla':
      return (
        <EscolhaMultipla
          titulo={p.titulo}
          obrigatoria={p.obrigatoria}
          textoObrigatoria={textoObrigatoria}
          opcoes={p.opcoes}
          escolhidas={Array.isArray(valor) ? (valor as readonly string[]) : []}
          descritores={descritores}
          onMudar={(v) => onMudar(v)}
        />
      );
    case 'avaliacao':
    case 'nps': {
      const nps = p.tipo === 'nps';
      return (
        <Escala
          obrigatoria={p.obrigatoria}
          invalida={invalida}
          de={nps ? 0 : 1}
          ate={nps ? 10 : 5}
          valor={typeof valor === 'number' ? valor : null}
          idioma={idioma}
          tituloId={tituloId}
          descritores={descritores}
          extremos={
            nps
              ? [t(INQ.npsMin, idioma), t(INQ.npsMax, idioma)]
              : [t(INQ.avaliacaoMin, idioma), t(INQ.avaliacaoMax, idioma)]
          }
          onMudar={(v) => onMudar(v)}
          onEscolher={(v) => onEscolher(v)}
        />
      );
    }
  }
}

function BlocoContacto({
  campos,
  textoConsentimento,
  idioma,
  base,
  valores,
  consentimento,
  erros,
  erroRef,
  onCampo,
  onConsentimento,
}: {
  campos: readonly CampoContacto[];
  textoConsentimento: string;
  idioma: Idioma;
  base: string;
  valores: DadosContacto;
  consentimento: boolean;
  erros: ReadonlySet<string>;
  erroRef: React.RefObject<HTMLElement | null>;
  onCampo: (c: CampoContacto, v: string) => void;
  onConsentimento: (v: boolean) => void;
}) {
  const faltaConsentimento = erros.has('contacto.consentimento');
  const primeiroErro = campos.find((c) => erros.has(`contacto.${c}`));

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {campos.map((c) => {
          const id = `${base}-c-${c}`;
          const comErro = erros.has(`contacto.${c}`);
          return (
            <div key={c} className="min-w-0">
              <label htmlFor={id} className="block text-sm font-medium">
                {t(ROTULO_CAMPO[c], idioma)}
              </label>
              <input
                id={id}
                // O foco do erro vai para o próprio campo: o leitor de ecrã diz
                // qual é e lê a mensagem (aria-describedby).
                ref={c === primeiroErro ? (erroRef as React.RefObject<HTMLInputElement | null>) : undefined}
                className={cn(inputClass, BORDA_CONTROLO, 'mt-2')}
                {...TIPO_CAMPO[c]}
                maxLength={c === 'email' ? 254 : 160}
                value={valores[c] ?? ''}
                aria-invalid={comErro || undefined}
                aria-describedby={comErro ? `${id}-erro` : undefined}
                onChange={(e) => onCampo(c, e.target.value)}
              />
              {comErro && (
                <div id={`${id}-erro`} className="mt-1.5 text-sm text-[color:var(--signal)]">
                  {t(
                    c === 'email'
                      ? INQ.contactoEmailInvalido
                      : c === 'telefone'
                        ? INQ.contactoTelefoneInvalido
                        : INQ.contactoInvalido,
                    idioma,
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consentimento}
          aria-invalid={faltaConsentimento || undefined}
          aria-describedby={faltaConsentimento ? `${base}-consentimento` : undefined}
          onChange={(e) => onConsentimento(e.target.checked)}
          className="mt-1 size-4 shrink-0"
        />
        <span className="whitespace-pre-line text-[color:var(--muted)]">{textoConsentimento}</span>
      </label>
      {faltaConsentimento && (
        <div
          ref={primeiroErro ? undefined : (erroRef as React.RefObject<HTMLDivElement | null>)}
          tabIndex={-1}
          role="alert"
          id={`${base}-consentimento`}
          className="text-sm text-[color:var(--signal)] outline-none"
        >
          {t(INQ.consentimentoFalta, idioma)}
        </div>
      )}
    </div>
  );
}
