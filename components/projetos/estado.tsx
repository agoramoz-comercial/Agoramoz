'use client';

import { createContext, useContext, useMemo, useReducer } from 'react';
import { CASA_REFERENCIA, FAZENDA_001 } from '@/content/projetos/fazenda-inteligente-001';
import type { FaseId, Projeto } from '@/content/projetos/tipos';
import type { CenarioAgro } from '@/lib/terrabuild/agro';
import type { Classe } from '@/lib/terrabuild/custos';
import type { CasaConfig } from '@/lib/terrabuild/quantidades';

/**
 * O estado da demo — e só na memória da página. Não há localStorage, cookie
 * nem pedido de rede: é a promessa «nada é guardado» feita por construção.
 * Um só redutor para o visualizador, o construtor, o painel agrícola e o
 * assistente verem a mesma casa e a mesma fase.
 */

export const CAMADAS = ['infraestruturas', 'agua', 'eletrica', 'talhoes', 'risco', 'progresso'] as const;
export type Camada = (typeof CAMADAS)[number];
export type Base = 'ortofoto' | 'mapa' | 'relevo';
export type Vista = '2d' | '3d';

export interface EstadoGemeo {
  readonly casa: CasaConfig;
  readonly alternativa: CasaConfig | null;
  readonly classe: Classe;
  readonly fase: FaseId;
  readonly vista: Vista;
  readonly base: Base;
  readonly camadas: readonly Camada[];
  readonly hora: number;
  readonly cultura: string;
  readonly hectares: number;
  readonly cenarioAgro: CenarioAgro;
}

type Acao =
  | { tipo: 'casa'; mudar: Partial<CasaConfig> }
  | { tipo: 'repor-casa' }
  | { tipo: 'guardar-alternativa' }
  | { tipo: 'limpar-alternativa' }
  | { tipo: 'classe'; classe: Classe }
  | { tipo: 'fase'; fase: FaseId }
  | { tipo: 'vista'; vista: Vista }
  | { tipo: 'base'; base: Base }
  | { tipo: 'camada'; camada: Camada }
  | { tipo: 'hora'; hora: number }
  | { tipo: 'cultura'; cultura: string; hectares?: number }
  | { tipo: 'hectares'; hectares: number }
  | { tipo: 'cenario-agro'; cenario: CenarioAgro };

export const ESTADO_INICIAL: EstadoGemeo = {
  casa: CASA_REFERENCIA,
  alternativa: null,
  classe: 'conceptual',
  fase: FAZENDA_001.faseAtual,
  vista: '2d',
  base: 'ortofoto',
  camadas: ['infraestruturas', 'agua', 'eletrica', 'talhoes'],
  hora: 10,
  cultura: 'milho',
  hectares: 2,
  cenarioAgro: 'base',
};

export function redutor(s: EstadoGemeo, a: Acao): EstadoGemeo {
  switch (a.tipo) {
    case 'casa':
      return { ...s, casa: { ...s.casa, ...a.mudar } };
    case 'repor-casa':
      return { ...s, casa: CASA_REFERENCIA };
    case 'guardar-alternativa':
      return { ...s, alternativa: s.casa };
    case 'limpar-alternativa':
      return { ...s, alternativa: null };
    case 'classe':
      return { ...s, classe: a.classe };
    case 'fase':
      return { ...s, fase: a.fase };
    case 'vista':
      return { ...s, vista: a.vista };
    case 'base':
      return { ...s, base: a.base };
    case 'camada':
      return {
        ...s,
        camadas: s.camadas.includes(a.camada) ? s.camadas.filter((c) => c !== a.camada) : [...s.camadas, a.camada],
      };
    case 'hora':
      return { ...s, hora: a.hora };
    case 'cultura':
      return { ...s, cultura: a.cultura, hectares: a.hectares ?? s.hectares };
    case 'hectares':
      return { ...s, hectares: a.hectares };
    case 'cenario-agro':
      return { ...s, cenarioAgro: a.cenario };
  }
}

interface Contexto {
  readonly projeto: Projeto;
  readonly estado: EstadoGemeo;
  readonly despachar: (a: Acao) => void;
}

const Ctx = createContext<Contexto | null>(null);

export function GemeoProvider({ children }: { children: React.ReactNode }) {
  const [estado, despachar] = useReducer(redutor, ESTADO_INICIAL);
  const valor = useMemo(() => ({ projeto: FAZENDA_001, estado, despachar }), [estado]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useGemeo(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGemeo fora do GemeoProvider');
  return c;
}
