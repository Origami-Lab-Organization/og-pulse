import { useState } from 'react';
import { Check, Copy, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { emTitulo, nomeDaEmpresa } from '@/lib/prospecting/empresasReceita';
import { FASE_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { formatCNPJ } from '@/lib/masks';
import { getTipoDeContaLabel } from '@/types/prospect';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import { RelacaoEParceiro } from '@/components/prospeccao/receita/SeloDeRelacao';
import { AcoesDaEmpresa } from './AcoesDaEmpresa';
import { useEdicaoDaEmpresa } from './edicaoDaEmpresa';
import { ICONE_DO_TIPO } from './iconesDoTipo';
import type { EmpresaDaPagina } from './useEmpresaDaPagina';

function CnpjCopiavel({ cnpj }: { cnpj: string }) {
  const [copiado, setCopiado] = useState(false);
  const formatado = formatCNPJ(cnpj);
  const copiar = () => {
    navigator.clipboard?.writeText(formatado).then(() => setCopiado(true)).catch(() => undefined);
    setTimeout(() => setCopiado(false), 1500);
  };
  const Icone = copiado ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar CNPJ ${formatado}`}
      className="inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 font-mono text-xs tabular-nums hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {formatado}
      <Icone className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

/** O selo do tipo de conta; na qualificação, clicar reabre o widget para trocar (US-0053). */
function SeloDoTipo({ pagina }: { pagina: EmpresaDaPagina }) {
  const { can } = useAuth();
  const { abrirWidget } = useEdicaoDaEmpresa();
  const tipo = pagina.empresaDoPulse?.tipo_conta;
  if (!tipo) return null;
  const Icone = ICONE_DO_TIPO[tipo];
  const classe = 'inline-flex items-center gap-1 rounded-full bg-info-subtle px-2 py-0.5 text-xs font-semibold text-info-emphasis';
  const conteudo = <><Icone className="h-3 w-3" aria-hidden="true" />{getTipoDeContaLabel(tipo)}</>;
  const trocavel = pagina.fase === FASE_DA_EMPRESA.QUALIFICACAO && !!pagina.ativa && can('prospeccao:editar');
  if (!trocavel) return <span className={classe}>{conteudo}</span>;
  return (
    <button type="button" onClick={() => abrirWidget(true)} aria-label={`Tipo de conta: ${getTipoDeContaLabel(tipo)}. Trocar`} className={`${classe} hover:ring-1 hover:ring-info-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
      {conteudo}
    </button>
  );
}

/** Razão social e CNPJ; o dono da qualificação quando há Oportunidade. Idade e atividade estão nos cartões. */
function LinhaDeIdentificacao({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const nome = nomeDaEmpresa(empresa);
  const razao = emTitulo(empresa.razao_social);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-muted-foreground">
      {razao !== nome && <span>{razao}</span>}
      <CnpjCopiavel cnpj={empresa.cnpj} />
      <DonoDaQualificacao pagina={pagina} />
    </div>
  );
}

/** Quem qualificou ou conduz a Oportunidade ativa: ícone e nome, na linha de identificação. */
function DonoDaQualificacao({ pagina }: { pagina: EmpresaDaPagina }) {
  const { byId } = useEmployeeDirectoryMap();
  const dono = pagina.ativa?.owner_id ? byId.get(pagina.ativa.owner_id)?.nome : null;
  if (!dono) return null;
  const rotulo = pagina.fase === FASE_DA_EMPRESA.QUALIFICACAO ? 'Dono da qualificação' : 'Dono da Oportunidade';
  return (
    <span className="inline-flex items-center gap-1" title={rotulo}>
      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{rotulo}: </span>
      {dono}
    </span>
  );
}

/** Cabeçalho da página da empresa (US-0053): identificação com o dono, relação, tipo de conta e ações. */
export function CabecalhoDaEmpresa(props: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { pagina, empresa } = props;
  const nome = nomeDaEmpresa(empresa);
  const { relacao = null, parceiro = false } = pagina.ficha.data ?? {};
  return (
    <header className="flex items-center justify-between gap-x-6 gap-y-3 max-sm:flex-wrap">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-card text-[15px] font-bold text-primary">
          {iniciais(nome)}
        </span>
        <div className="min-w-0">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[22px] font-bold leading-tight tracking-tight">
            {nome}
            <RelacaoEParceiro relacao={relacao} parceiro={parceiro} />
            <SeloDoTipo pagina={pagina} />
          </h1>
          <LinhaDeIdentificacao pagina={pagina} empresa={empresa} />
        </div>
      </div>
      <div className="shrink-0"><AcoesDaEmpresa pagina={pagina} empresa={empresa} /></div>
    </header>
  );
}
