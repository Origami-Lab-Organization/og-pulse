import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HELP_GROUPS } from '@/content/helpTopics';

/**
 * O teste original garantia que Estratégia não fosse admin-only. A regra continua, o
 * mecanismo é outro: a rota exige `iniciativa:editar`, que gerente tem e admin também
 * (ADR-0027). A asserção sobre o item de menu saiu porque Estratégia foi retirada da
 * navegação no recorte de MVP — hoje se chega por link e pela Central de Ajuda, e é
 * essa dupla que precisa declarar a MESMA capacidade da rota.
 */
const CAPACIDADE_DA_ROTA = 'iniciativa:editar';

describe('Strategy navigation access', () => {
  it('a rota /estrategia exige editar iniciativa, não administrar o sistema', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');

    expect(appSource).toContain(
      `<Route path="/estrategia" element={<RoleProtectedRoute requireCapability="${CAPACIDADE_DA_ROTA}"><Strategy /></RoleProtectedRoute>} />`,
    );
    expect(appSource).not.toContain(
      '<Route path="/estrategia" element={<RoleProtectedRoute requireCapability="configuracao:editar">',
    );
  });

  it('a Central de Ajuda declara a mesma capacidade da rota', () => {
    const topicos = HELP_GROUPS.flatMap((g) => g.topics).filter((t) => t.route === '/estrategia');

    expect(topicos.length).toBeGreaterThan(0);
    for (const topico of topicos) {
      expect(topico.requiresCapability).toBe(CAPACIDADE_DA_ROTA);
    }
  });
});
