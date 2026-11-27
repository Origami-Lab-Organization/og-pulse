import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, History, MoreVertical, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useMarcarEmpresa } from '@/hooks/useMarcasDaEmpresa';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import { nomeDaEmpresa } from '@/lib/prospecting/empresasReceita';
import { ETAPA_A_ABORDAR, FASE_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { ModoDaDecisao } from '@/types/decisoesDaBase';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import type { EmpresaParaMarcar } from '@/types/marcasDaEmpresa';
import type { ProspectWithCompany } from '@/types/prospect';
import { CompanyDetailDialog } from '@/components/prospeccao/CompanyDetailDialog';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ColocarParaAbordarDialog } from '@/components/prospeccao/receita/ColocarParaAbordarDialog';
import { DecisaoNaBaseDialog } from '@/components/prospeccao/receita/DecisaoNaBaseDialog';
import { AntesDoPulseDialog } from './AntesDoPulseDialog';
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
  podeEditar: boolean;
  podeMarcarAntes: boolean;
  onEditar: () => void;
  onDecidir: (modo: ModoDaDecisao) => void;
  onDescartarOportunidade: (prospect: ProspectWithCompany) => void;
  onParceiro: () => void;
  onAntesDoPulse: () => void;
}

/** Parceiro (quem edita a Prospecção) e "Cliente antes do Pulse" (o admin), US-0051. */
function ItensDeMarca(props: MenuProps) {
  const { pagina, podeEditar, podeMarcarAntes, onParceiro, onAntesDoPulse } = props;
  const parceiro = !!pagina.ficha.data?.parceiro;
  return (
    <>
      {podeEditar && (
        <DropdownMenuItem onSelect={onParceiro}>
          <Handshake className="mr-2 h-4 w-4" aria-hidden="true" />
          {parceiro ? 'Tirar marca de Parceiro' : 'Marcar como Parceiro'}
        </DropdownMenuItem>
      )}
      {podeMarcarAntes && (
        <DropdownMenuItem onSelect={onAntesDoPulse}>
          <History className="mr-2 h-4 w-4" aria-hidden="true" />
          Cliente antes do Pulse
        </DropdownMenuItem>
      )}
    </>
  );
}

/** "Não agora" e descartar sem Oportunidade; com ela, registrar a Perda. */
function ItensDaDecisao(props: MenuProps) {
  const { pagina, onDecidir, onDescartarOportunidade } = props;
  const { ativa } = pagina;
  if (ativa) {
    return (
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDescartarOportunidade(ativa)}>
        Registrar Perda
      </DropdownMenuItem>
    );
  }
  return (
    <>
      <DropdownMenuItem onSelect={() => onDecidir(DECIDIR.NAO_AGORA)}>Não agora</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDecidir(DECIDIR.DESCARTAR)}>
        Descartar
      </DropdownMenuItem>
    </>
  );
}

/** Ações secundárias no "⋮": editar dados, as marcas, "Não agora" e descartar. */
function MenuDaEmpresa(props: MenuProps) {
  const { pagina, podeEditar, onEditar } = props;
  const editavel = podeEditar && !!pagina.linha;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mais ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {editavel && (
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar dados
          </DropdownMenuItem>
        )}
        <ItensDeMarca {...props} />
        {podeEditar && <DropdownMenuSeparator />}
        {podeEditar && <ItensDaDecisao {...props} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const empresaParaMarcar = (empresa: EmpresaDaFicha): EmpresaParaMarcar => ({
  cnpj: empresa.cnpj,
  nome: nomeDaEmpresa(empresa),
  cidade: empresa.municipio ?? null,
  estado: empresa.uf ?? null,
});

/** A empresa para as marcas (US-0051), o Parceiro de um clique e o ano de antes do Pulse já marcado. */
function useMarcasDaPagina(pagina: EmpresaDaPagina, empresa: EmpresaDaFicha) {
  const marcar = useMarcarEmpresa();
  const paraMarcar = empresaParaMarcar(empresa);
  const parceiro = !!pagina.ficha.data?.parceiro;
  return {
    paraMarcar,
    alternarParceiro: () => marcar.mutate({ empresa: paraMarcar, marca: { parceiro: !parceiro } }),
    antesDoPulseAtual: pagina.ficha.data?.historico?.antesDoPulse ?? null,
  };
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
  const podeMarcarAntes = can('cliente:marcar-antes-do-pulse');
  const [movendo, setMovendo] = useState(false);
  const [antesDoPulse, setAntesDoPulse] = useState(false);
  const [editando, setEditando] = useState(false);
  const [decidindo, setDecidindo] = useState<ModoDaDecisao | null>(null);
  const [perdendo, setPerdendo] = useState<ProspectWithCompany | null>(null);
  const comRelacao = { ...empresa, relacao: pagina.ficha.data?.relacao ?? null };
  const { paraMarcar, alternarParceiro, antesDoPulseAtual } = useMarcasDaPagina(pagina, empresa);

  return (
    <div className="flex items-center gap-1">
      <AcaoPrincipal pagina={pagina} empresa={empresa} podeEditar={podeEditar} onMover={() => setMovendo(true)} />
      {(podeEditar || podeMarcarAntes) && (
        <MenuDaEmpresa
          pagina={pagina}
          podeEditar={podeEditar}
          podeMarcarAntes={podeMarcarAntes}
          onEditar={() => setEditando(true)}
          onDecidir={setDecidindo}
          onDescartarOportunidade={setPerdendo}
          onParceiro={alternarParceiro}
          onAntesDoPulse={() => setAntesDoPulse(true)}
        />
      )}
      <AntesDoPulseDialog
        aberto={antesDoPulse}
        onFechar={() => setAntesDoPulse(false)}
        empresa={paraMarcar}
        atual={antesDoPulseAtual}
      />
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
