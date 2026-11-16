import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { BulkCompanyImportDialog } from '@/components/prospeccao/BulkCompanyImportDialog';
import { ContasDaProspeccao } from '@/components/prospeccao/ContasDaProspeccao';
import { AbasDaLista } from '@/components/prospeccao/ListaDeCadastro';
import { EmpresasDaReceita } from '@/components/prospeccao/receita/EmpresasDaReceita';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';

type AbaDeEmpresas = 'classificar' | 'prospeccao';

const ABA_PROSPECCAO: AbaDeEmpresas = 'prospeccao';

const ABAS: ReadonlyArray<{ valor: AbaDeEmpresas; rotulo: string }> = [
  { valor: 'classificar', rotulo: 'A classificar' },
  { valor: ABA_PROSPECCAO, rotulo: 'Na Prospecção' },
];

/**
 * Empresas (16/11/2026, US-0002, ADR-0053): a base da Receita para achar contas novas, e as
 * contas que já estão na Prospecção.
 *
 * A aba fica na URL (`?aba=prospeccao`) para o voltar do navegador e o link das notificações
 * de gatilho (`?empresa=<id>`) caírem no lugar certo.
 */
export default function ProspeccaoEmpresas() {
  const { can } = useAuth();
  const [importando, setImportando] = useState(false);
  const [params, setParams] = useSearchParams();
  const { data: contas = [] } = useProspectCompanies();

  const aba: AbaDeEmpresas = params.get('aba') === ABA_PROSPECCAO || params.has('empresa') ? ABA_PROSPECCAO : 'classificar';
  const trocarDeAba = (nova: AbaDeEmpresas) =>
    setParams((atual) => {
      if (nova === ABA_PROSPECCAO) atual.set('aba', nova);
      else atual.delete('aba');
      return atual;
    });

  return (
    <AppLayout
      title="Empresas"
      description="As médias e grandes empresas do país e as contas que já estão na Prospecção"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Empresas' }]}
      actions={
        can('prospeccao:editar') && (
          <Button onClick={() => setImportando(true)}>
            <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
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
          contagem={{ prospeccao: contas.length }}
          onChange={trocarDeAba}
        />
        <div role="tabpanel" aria-label={ABAS.find((a) => a.valor === aba)?.rotulo}>
          {aba === ABA_PROSPECCAO ? <ContasDaProspeccao /> : <EmpresasDaReceita />}
        </div>
      </div>
    </AppLayout>
  );
}
