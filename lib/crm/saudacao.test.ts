import { describe, expect, it } from 'vitest';
import { saudacao } from './hoje';

describe('HOJE-01 saudação na hora de Maputo', () => {
  it('manhã, tarde e noite em Maputo (UTC+2)', () => {
    expect(saudacao(new Date('2026-11-25T07:00:00Z'))).toBe('Bom dia'); // 09:00
    expect(saudacao(new Date('2026-11-25T12:00:00Z'))).toBe('Boa tarde'); // 14:00
    expect(saudacao(new Date('2026-11-25T18:00:00Z'))).toBe('Boa noite'); // 20:00
  });
});
