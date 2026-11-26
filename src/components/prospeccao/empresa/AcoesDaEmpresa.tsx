import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import { nomeDaEmpresa } from '@/lib/prospecting/empresasReceita';
import { ETAPA_A_ABORDAR, FASE_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { ModoDaDecisao } from '@/types/decisoesDaBase';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import type { ProspectWithCompany } from '@/types/prospect';
import { CompanyDetailDialog } from '@/components/prospeccao/CompanyDetailDialog';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ColocarParaAbordarDialog } from '@/components/prospeccao/receita/ColocarParaAbordarDialog';
import { DecisaoNaBaseDialog } from '@/components/prospeccao/receita/DecisaoNaBaseDialog';
import type { EmpresaDaPagina } from './useEmpresaDaPagina';

const DECIDIR = { NAO_AGORA: 'nao_agora' as ModoDaDecisao, DESCARTAR: 'descartar' as ModoDaDecisao };

const linkDaOportunidade = (id: string) => `/comercial/prospeccao?oportunidade=${encodeURIComponent(id)}`;

/** A ação principal pela fase (US-0053): qualificar, criar, abrir ou abrir uma nova Oportunidade. */
function AcaoPrincipal(props: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha; podeEditar: boolean; onMover: () => void }) {
  const { pagina, podeEditar, onMover } = props;
  const navigate = useNavigate();
  const mudarEtapa = useUpdateProspectStage();
  const { fase, ativa } = pagina;
  if (fase === FASE_DA_EMPRESA.ANDAMENTO && ativa) {
    return <Button onClick={() => navigate(linkDaOportunidade(ativa.id))}>Abrir Oportunidade</Button>;
  }
  if (!podeEditar) return null;
  if (fase === FASE_DA_EMPRESA.QUALIFICACAO && ativa) {
    return (
      <Button disabled={mudarEtapa.isPending} onClick={() => mudarEtapa.mutate({ id: ativa.id, stage: ETAPA_A_ABORDAR })}>
        <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Criar Oportunidade
      </Button>
    );
  }
  if (fase === FASE_DA_EMPRESA.CLIENTE) {
    return (
      <Button onClick={onMover}>
        <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Nova Oportunidade
      </Button>
    );
  }
  return <Button onClick={onMover}>Mover para qualificação</Button>;
}

interface MenuProps {
  pagina: EmpresaDaPagina;
  onEditar: () => void;
  onDecidir: (modo: ModoDaDecisao) => void;
  onDescartarOportunidade: (prospect: ProspectWithCompany) => void;
}

/** Ações secundárias no "⋮": editar dados, "Não agora" e descartar. */
function MenuDaEmpresa(props: MenuProps) {
  const { pagina, onEditar, onDecidir, onDescartarOportunidade } = props;
  const { ativa, linha } = pagina;
  const semOportunidade = !ativa;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mais ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {linha && (
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar dados
          </DropdownMenuItem>
        )}
        {linha && <DropdownMenuSeparator />}
        {semOportunidade && <DropdownMenuItem onSelect={() => onDecidir(DECIDIR.NAO_AGORA)}>Não agora</DropdownMenuItem>}
        {semOportunidade && (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDecidir(DECIDIR.DESCARTAR)}>
            Descartar
          </DropdownMenuItem>
        )}
        {ativa && (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDescartarOportunidade(ativa)}>
            Registrar Perda
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Ações da página da empresa (US-0053): a principal pela fase e as demais no "⋮". Só quem tem
 * `prospeccao:editar` age; "Abrir Oportunidade" basta ler a Prospecção.
 */
export function AcoesDaEmpresa(props: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { pagina, empresa } = props;
  const { can } = useAuth();
  const navigate = useNavigate();
  const podeEditar = can('prospeccao:editar');
  const [movendo, setMovendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [decidindo, setDecidindo] = useState<ModoDaDecisao | null>(null);
  const [perdendo, setPerdendo] = useState<ProspectWithCompany | null>(null);
  const comRelacao = { ...empresa, relacao: pagina.ficha.data?.relacao ?? null };

  return (
    <div className="flex items-center gap-1">
      <AcaoPrincipal pagina={pagina} empresa={empresa} podeEditar={podeEditar} onMover={() => setMovendo(true)} />
      {podeEditar && (
        <MenuDaEmpresa pagina={pagina} onEditar={() => setEditando(true)} onDecidir={setDecidindo} onDescartarOportunidade={setPerdendo} />
      )}
      <ColocarParaAbordarDialog empresas={[comRelacao]} aberta={movendo} onAbertaChange={setMovendo} />
      <DecisaoNaBaseDialog modo={decidindo} empresas={[{ cnpj: empresa.cnpj, nome: nomeDaEmpresa(empresa) }]} onFechar={() => setDecidindo(null)} />
      <DiscardProspectDialog prospect={perdendo} open={!!perdendo} onOpenChange={(aberta) => !aberta && setPerdendo(null)} />
      <CompanyDetailDialog
        row={pagina.linha}
        open={editando}
        onOpenChange={setEditando}
        iniciarEditando
        onOpenOpportunity={(p) => navigate(linkDaOportunidade(p.id))}
      />
    </div>
  );
}
