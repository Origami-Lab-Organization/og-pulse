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
import { ListaDeClientes } from '@/components/prospeccao/clientes/ListaDeClientes';
import { ABA_CLIENTES } from '@/lib/carteira.constants';

type AbaDeEmpresas = 'base' | 'qualificacao' | typeof ABA_CLIENTES;

const ABA_BASE: AbaDeEmpresas = 'base';
const ABA_QUALIFICACAO: AbaDeEmpresas = 'qualificacao';

const ABAS_DA_PROSPECCAO: ReadonlyArray<{ valor: AbaDeEmpresas; rotulo: string }> = [
  { valor: ABA_BASE, rotulo: 'Base de empresas' },
  { valor: ABA_QUALIFICACAO, rotulo: 'Em qualificação' },
];
const ABA_DA_CARTEIRA = { valor: ABA_CLIENTES as AbaDeEmpresas, rotulo: 'Clientes' };

/** Quem só tem a carteira (`cliente:ler`) vê só a aba Clientes (US-0049). */
function abasDe(lerProspeccao: boolean) {
  return lerProspeccao ? [...ABAS_DA_PROSPECCAO, ABA_DA_CARTEIRA] : [ABA_DA_CARTEIRA];
}

function abaPedida(pedida: string | null, abas: ReadonlyArray<{ valor: AbaDeEmpresas }>): AbaDeEmpresas {
  return abas.find((a) => a.valor === pedida)?.valor ?? abas[0].valor;
}

function ConteudoDaAba({ aba }: { aba: AbaDeEmpresas }) {
  if (aba === ABA_QUALIFICACAO) return <EmQualificacao />;
  if (aba === ABA_CLIENTES) return <ListaDeClientes />;
  return <EmpresasDaReceita />;
}

/**
 * Empresas (16/11/2026, US-0002, ADR-0053): achar e qualificar contas, em duas abas (19/11/2026,
 * US-0023). "Base de empresas" é o filtro da base da Receita; a empresa escolhida, com o tipo de conta, vai
 * para "Em qualificação", onde é estudada (BANT, desk research). Qualificada, vai para A abordar
 * no Pipeline de Oportunidades. A aba fica na URL (`?aba=qualificacao`).
 *
 * Link antigo das notificações de gatilho (`?empresa=<id>`) segue para o Pipeline, que abre a
 * ficha da empresa.
 *
 * US-0049 (ADR-0056): a página Clientes saiu; a carteira é a aba Clientes (`?aba=clientes`).
 */
export default function ProspeccaoEmpresas() {
  const { can } = useAuth();
  const [importando, setImportando] = useState(false);
  const [params, setParams] = useSearchParams();
  const empresaDoLink = params.get('empresa');
  const lerProspeccao = can('prospeccao:ler');
  const { lista: emQualificacao } = useEmQualificacao();
  const abas = abasDe(lerProspeccao);
  const aba = abaPedida(params.get('aba'), abas);
  const trocarDeAba = (nova: AbaDeEmpresas) =>
    setParams((atual) => {
      if (nova === abas[0].valor) atual.delete('aba');
      else atual.set('aba', nova);
      return atual;
    });

  if (empresaDoLink) return <Navigate to={`/comercial/prospeccao?empresa=${encodeURIComponent(empresaDoLink)}`} replace />;

  return (
    <AppLayout
      title="Empresas"
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
        {abas.length > 1 && (
          <AbasDaLista
            rotulo="Empresas"
            abas={abas}
            valor={aba}
            contagem={{ qualificacao: lerProspeccao ? emQualificacao.length : null }}
            onChange={trocarDeAba}
          />
        )}
        <div role="tabpanel" aria-label={abas.find((a) => a.valor === aba)?.rotulo}>
          <ConteudoDaAba aba={aba} />
        </div>
      </div>
    </AppLayout>
  );
}
