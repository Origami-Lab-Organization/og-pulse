import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { BulkCompanyImportDialog } from '@/components/prospeccao/BulkCompanyImportDialog';
import { AbasDaLista } from '@/components/prospeccao/ListaDeCadastro';
import { EmQualificacao } from '@/components/prospeccao/qualificacao/EmQualificacao';
import { useEmQualificacao } from '@/hooks/useEmQualificacao';
import { EmpresasDaReceita } from '@/components/prospeccao/receita/EmpresasDaReceita';
import { useAuth } from '@/contexts/AuthContext';

type AbaDeEmpresas = 'base' | 'qualificacao';

const ABA_QUALIFICACAO: AbaDeEmpresas = 'qualificacao';

const ABAS: ReadonlyArray<{ valor: AbaDeEmpresas; rotulo: string }> = [
  { valor: 'base', rotulo: 'Base de empresas' },
  { valor: ABA_QUALIFICACAO, rotulo: 'Em qualificação' },
];

/**
 * Empresas (16/11/2026, US-0002, ADR-0053): achar e qualificar contas, em duas abas (19/11/2026,
 * US-0023). "Base de empresas" é o filtro da base da Receita; a empresa escolhida, com o tipo de conta, vai
 * para "Em qualificação", onde é estudada (BANT, desk research). Qualificada, vai para A abordar
 * no Pipeline de Oportunidades. A aba fica na URL (`?aba=qualificacao`).
 *
 * Link antigo das notificações de gatilho (`?empresa=<id>`) segue para o Pipeline, que abre a
 * ficha da empresa.
 */
export default function ProspeccaoEmpresas() {
  const { can } = useAuth();
  const [importando, setImportando] = useState(false);
  const [params, setParams] = useSearchParams();
  const empresaDoLink = params.get('empresa');
  const { lista: emQualificacao } = useEmQualificacao();
  const aba: AbaDeEmpresas = params.get('aba') === ABA_QUALIFICACAO ? ABA_QUALIFICACAO : 'base';
  const trocarDeAba = (nova: AbaDeEmpresas) =>
    setParams((atual) => {
      if (nova === ABA_QUALIFICACAO) atual.set('aba', nova);
      else atual.delete('aba');
      return atual;
    });

  if (empresaDoLink) return <Navigate to={`/comercial/prospeccao?empresa=${encodeURIComponent(empresaDoLink)}`} replace />;

  return (
    <AppLayout
      title="Empresas"
      description="Ache as contas na base da Receita e qualifique antes de abordar"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Empresas' }]}
      actions={
        can('prospeccao:editar') && (
          // Uso raro (empresa fora da base): botão discreto, de contorno (18/11/2026).
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-[13px]" onClick={() => setImportando(true)}>
            <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            Importar CNPJs
          </Button>
        )
      }
    >
      <BulkCompanyImportDialog open={importando} onOpenChange={setImportando} />
      <div className="space-y-3.5">
        <AbasDaLista
          rotulo="Empresas"
          abas={ABAS}
          valor={aba}
          contagem={{ qualificacao: emQualificacao.length }}
          onChange={trocarDeAba}
        />
        <div role="tabpanel" aria-label={ABAS.find((a) => a.valor === aba)?.rotulo}>
          {aba === ABA_QUALIFICACAO ? <EmQualificacao /> : <EmpresasDaReceita />}
        </div>
      </div>
    </AppLayout>
  );
}
