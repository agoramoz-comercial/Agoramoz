'use client';

import { useCallback, useRef } from 'react';
import { track } from '@/lib/analytics/track';
import { PROJECT_DEMO_IDS, type ProjectDemoAction, type ProjectDemoId } from '@/lib/analytics/events';

/**
 * Analítica da demo: uma vez por ação e por visita à página, só com o
 * identificador do projeto e o nome da ação — nunca valores, textos ou o que
 * a pessoa escreveu. Mede o que se explora, não quem explora.
 */
export function useRastreio(projectId: string) {
  const feitos = useRef(new Set<ProjectDemoAction>());
  return useCallback(
    (action: ProjectDemoAction) => {
      // Só projetos de demonstração conhecidos: o schema do servidor recusaria os outros.
      if (!(PROJECT_DEMO_IDS as readonly string[]).includes(projectId) || feitos.current.has(action)) return;
      feitos.current.add(action);
      track({ name: 'project_demo_interaction', projectId: projectId as ProjectDemoId, action });
    },
    [projectId],
  );
}
