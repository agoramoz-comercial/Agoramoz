'use client';

import { Component, type ReactNode } from 'react';

/**
 * Um erro num componente pesado (WebGL, canvas, formulário) fica nesse
 * componente: mostra-se a alternativa e o resto da página continua. Sem isto,
 * uma excepção no carrossel levava o site inteiro para o ecrã de erro.
 */
export class ErroLocal extends Component<{ alternativa: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch(erro: unknown) {
    console.warn('[ErroLocal]', erro instanceof Error ? erro.message : 'erro');
  }
  render() {
    return this.state.erro ? this.props.alternativa : this.props.children;
  }
}
