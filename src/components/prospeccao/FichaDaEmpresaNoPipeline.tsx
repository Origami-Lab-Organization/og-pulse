import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rotaDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { useLinhaDaEmpresa } from '@/hooks/useLinhaDaEmpresa';
import type { ProspectWithCompany } from '@/types/prospect';
import { CompanyDetailDialog } from './CompanyDetailDialog';

interface FichaDaEmpresaNoPipelineProps {
  empresaId: string | null;
  onEmpresaId: (id: string | null) => void;
  /** Uma oportunidade da lista da ficha: fecha a ficha e abre a oportunidade. */
  onAbrirOportunidade: (prospect: ProspectWithCompany) => void;
}

/**
 * A ficha completa da empresa, aberta de dentro da oportunidade (18/11/2026): a tela Empresas
 * virou só a base da Receita com filtros, e a lista de contas saiu. O link das notificações de
 * gatilho (`?empresa=<id>`, company-watch) também abre esta ficha.
 */
export function FichaDaEmpresaNoPipeline(props: FichaDaEmpresaNoPipelineProps) {
  const { empresaId, onEmpresaId, onAbrirOportunidade } = props;
  const linha = useLinhaDaEmpresa(empresaId);
  const [params, setParams] = useSearchParams();
  const empresaDoLink = params.get('empresa');

  useEffect(() => {
    if (!empresaDoLink) return;
    onEmpresaId(empresaDoLink);
    // O parâmetro sai depois de usado: fechar a ficha não pode reabri-la.
    setParams((atual) => {
      atual.delete('empresa');
      return atual;
    }, { replace: true });
  }, [empresaDoLink, onEmpresaId, setParams]);

  // US-0053: empresa com CNPJ abre na página dela; o modal fica só para quem não tem CNPJ.
  const navigate = useNavigate();
  const cnpj = linha?.company.cnpj ?? null;
  useEffect(() => {
    if (!cnpj) return;
    onEmpresaId(null);
    navigate(rotaDaEmpresa(cnpj), { state: { de: 'pipeline' } });
  }, [cnpj, navigate, onEmpresaId]);
  if (cnpj) return null;

  return (
    <CompanyDetailDialog
      row={linha}
      open={!!linha}
      onOpenChange={(aberta) => !aberta && onEmpresaId(null)}
      onOpenOpportunity={(prospect) => {
        onEmpresaId(null);
        onAbrirOportunidade(prospect);
      }}
    />
  );
}
