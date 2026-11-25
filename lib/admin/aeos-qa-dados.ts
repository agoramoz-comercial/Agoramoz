import type { AccaoAgente } from './agentes';

/** Acções de exemplo para a pré-visualização de QA do Mapa AEOS. */
export const ACCOES_QA: AccaoAgente[] = [
  { id: '00000000-0000-4000-8000-000000000001', agente: 'AG-14', tipo: 'publicacao', titulo: 'Exemplo de QA: publicar campanha', descricao: '', estado: 'precisa_aprovacao', alvo: 'bloco-2', criadaEm: '2026-11-25T10:00:00Z' },
  { id: '00000000-0000-4000-8000-000000000002', agente: 'AG-07', tipo: 'tarefa_interna', titulo: 'Exemplo de QA: rever margem', descricao: '', estado: 'registada', alvo: 'bloco-5', criadaEm: '2026-11-25T09:00:00Z' },
];
