import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { BulkCompanyImportDialog } from '@/components/prospeccao/BulkCompanyImportDialog';
import { EmpresasDaReceita } from '@/components/prospeccao/receita/EmpresasDaReceita';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Empresas (16/11/2026, US-0002, ADR-0053): a base da Receita com filtros, para achar contas
 * novas. Desde 18/11/2026 a tela é só esse filtro, sem abas: a empresa escolhida é classificada
 * (tipo de conta) e vai direto para A abordar no Pipeline de Oportunidades (US-0008). A ficha
 * completa de uma empresa cadastrada abre de dentro da oportunidade.
 *
 * Link antigo das notificações de gatilho (`?empresa=<id>`) segue para o Pipeline, que abre a
 * ficha da empresa.
 */
export default function ProspeccaoEmpresas() {
  const { can } = useAuth();
  const [importando, setImportando] = useState(false);
  const [params] = useSearchParams();
  const empresaDoLink = params.get('empresa');

  if (empresaDoLink) return <Navigate to={`/comercial/prospeccao?empresa=${encodeURIComponent(empresaDoLink)}`} replace />;

  return (
    <AppLayout
      title="Empresas"
      description="As médias e grandes empresas do país: filtre, escolha e coloque para abordar"
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
      <EmpresasDaReceita />
    </AppLayout>
  );
}
