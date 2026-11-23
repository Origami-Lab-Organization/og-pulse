import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useFichaReceita } from '@/hooks/useEmpresasReceita';
import { formatDate } from '@/lib/formatters';
import { formatCNPJ } from '@/lib/masks';
import { divisaoDoCnae, nomeDoRamo, setorDoCnae, SETORES } from '@/lib/prospecting/cnae';
import { anosDeOperacao, emTitulo, nomeDaEmpresa, reaisCurtos } from '@/lib/prospecting/empresasReceita';
import {
  contaDoFaturamento,
  lucroRealPeloTime,
  lucroRealProvavel,
  ROTULO_DA_BASE,
  ROTULO_DO_INFORMADO,
  textoDoFaturamento,
  textoDoInformado,
} from '@/lib/prospecting/faturamentoEstimado';
import { fitDaBase } from '@/lib/prospecting/fitDaBase';
import { rotuloDoCnae } from '@/lib/prospecting/filtrosReceita';
import { getDiscardReasonLabel } from '@/types/prospect';
import { etapaDaOportunidade, statusDoProjeto } from '@/lib/prospecting/relacao';
import type { OportunidadeDaRelacao, ProjetoDaRelacao } from '@/types/relacao';
import { nomeDaQualificacao } from '@/lib/prospecting/qualificacoesDeSocio';
import type { ContatoDaFicha, EmpresaDaFicha, FichaReceita, SocioDaFicha } from '@/types/fichaReceita';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ColocarParaAbordarDialog } from './ColocarParaAbordarDialog';
import { SeloDeRelacao } from './SeloDeRelacao';

interface FichaDaEmpresaReceitaProps {
  /** CNPJ da empresa aberta; nulo = ficha fechada. */
  cnpj: string | null;
  onFechar: () => void;
}

const AVISO_LUCRO_REAL = 'Lucro Real provável: acima de R$ 78 mi por ano, o regime é obrigatório (Lei 9.718/1998, art. 14). Confirme na consulta da Receita.';
const AVISO_FINEP = 'Dívida ajuizada pode dificultar FINEP e crédito público; confirme com o time de financiamento.';
const PENDENTES = 'Regime tributário, site, fomento público e contratos com o governo entram no fit quando a empresa vira oportunidade e a consulta da Receita é feita.';

/**
 * Ficha de uma empresa da base da Receita (US-0007): tudo que a base sabe, para decidir sem
 * sair da lista. Gaveta à direita; Esc, o "x" ou um clique fora fecham e devolvem o foco à
 * linha. No rodapé, "Mover para qualificação" (US-0008, US-0023).
 */
export function FichaDaEmpresaReceita({ cnpj, onFechar }: FichaDaEmpresaReceitaProps) {
  const ficha = useFichaReceita(cnpj);
  useHideValues();
  return (
    <Sheet open={!!cnpj} onOpenChange={(aberta) => !aberta && onFechar()}>
      <SheetContent side="right" className="flex w-[min(96vw,520px)] flex-col gap-0 p-0 sm:max-w-none">
        <Conteudo ficha={ficha} />
      </SheetContent>
    </Sheet>
  );
}

function Conteudo({ ficha }: { ficha: ReturnType<typeof useFichaReceita> }) {
  if (ficha.isLoading) return <Carregando />;
  if (ficha.error || !ficha.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <SheetTitle className="text-base">Não deu para carregar a ficha</SheetTitle>
        <SheetDescription>A base da Receita não respondeu agora.</SheetDescription>
        <Button variant="outline" size="sm" onClick={() => ficha.refetch()}>Tentar de novo</Button>
      </div>
    );
  }
  const { empresa, contato, socios, oportunidades } = ficha.data;
  const comRelacao = { ...empresa, relacao: ficha.data.relacao ?? null };
  return (
    <>
      <Cabecalho empresa={empresa} />
      <div className="flex-1 overflow-y-auto">
        <RelacaoComAOrigami ficha={ficha.data} />
        <Identificacao empresa={empresa} />
        <Atividade empresa={empresa} />
        <Tamanho empresa={empresa} />
        <FitPorFrente empresa={empresa} />
        <Divida empresa={empresa} />
        <Contato contato={contato} />
        <RedeEContato empresa={empresa} socios={socios} />
      </div>
      <Rodape empresa={comRelacao} emAndamento={oportunidades.length > 0} />
    </>
  );
}

/** Mover para qualificação (US-0008, US-0023): só com `prospeccao:editar` e sem oportunidade em andamento. */
function Rodape({ empresa, emAndamento }: { empresa: EmpresaDaFicha; emAndamento: boolean }) {
  const { can } = useAuth();
  const [colocando, setColocando] = useState(false);
  if (emAndamento || !can('prospeccao:editar')) return null;
  return (
    <div className="border-t bg-card px-5 py-4">
      <Button className="w-full" onClick={() => setColocando(true)}>Mover para qualificação</Button>
      <ColocarParaAbordarDialog empresas={[empresa]} aberta={colocando} onAbertaChange={setColocando} />
    </div>
  );
}

function Carregando() {
  return (
    <div className="space-y-3 p-5" aria-busy="true">
      <SheetTitle className="sr-only">Carregando a ficha</SheetTitle>
      <SheetDescription className="sr-only">Buscando os dados da empresa na base da Receita.</SheetDescription>
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );
}

function Cabecalho({ empresa }: { empresa: EmpresaDaFicha }) {
  const razao = emTitulo(empresa.razao_social);
  const nome = nomeDaEmpresa(empresa);
  return (
    <SheetHeader className="space-y-1 border-b px-5 py-4 pr-12 text-left">
      <SheetTitle className="text-lg leading-snug">{nome}</SheetTitle>
      <SheetDescription className="text-[13px]">
        {razao !== nome && <span className="block">{razao}</span>}
        <span className="font-mono tabular-nums">{formatCNPJ(empresa.cnpj)}</span>
      </SheetDescription>
    </SheetHeader>
  );
}

// ---------- seções ----------

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-b px-5 py-4 last:border-b-0">
      <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
      {children}
    </section>
  );
}

function Itens({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">{children}</dl>;
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function Aviso({ children, alerta = false }: { children: ReactNode; alerta?: boolean }) {
  return (
    <p className={cn('mt-2.5 flex gap-2 rounded-md px-3 py-2 text-[12.5px] leading-snug', alerta ? 'bg-destructive-subtle text-destructive-emphasis' : 'bg-info-subtle text-info-emphasis')}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const traco = <span className="text-muted-foreground">—</span>;

/** Relação com a Origami e o histórico resumido (US-0019, cenário 7). */
function RelacaoComAOrigami({ ficha }: { ficha: FichaReceita }) {
  if (ficha.relacao_indisponivel) {
    return (
      <Secao titulo="Relação com a Origami">
        <p className="text-[13px] text-muted-foreground">A relação com a Origami não carregou agora.</p>
      </Secao>
    );
  }
  const historico = ficha.historico;
  const oportunidades = [...(historico?.oportunidades ?? [])].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  const projetos = historico?.projetos ?? [];
  return (
    <Secao titulo="Relação com a Origami">
      <div className="space-y-2.5">
        {ficha.relacao ? <SeloDeRelacao relacao={ficha.relacao} /> : <p className="text-[13px] text-muted-foreground">Sem relação com a Origami.</p>}
        {projetos.length > 0 && <ListaDoHistorico titulo="Projetos">{projetos.map((p) => <ItemDeProjeto key={p.id} projeto={p} />)}</ListaDoHistorico>}
        {oportunidades.length > 0 && (
          <ListaDoHistorico titulo="Oportunidades">{oportunidades.map((o) => <ItemDeOportunidade key={o.id} oportunidade={o} />)}</ListaDoHistorico>
        )}
      </div>
    </Secao>
  );
}

function ListaDoHistorico({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

const LINK_DO_HISTORICO = 'flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function ItemDeProjeto({ projeto }: { projeto: ProjetoDaRelacao }) {
  return (
    <li>
      <Link to={`/projects/${encodeURIComponent(projeto.id)}`} className={LINK_DO_HISTORICO}>
        <span className="min-w-0 truncate font-medium">{projeto.name}</span>
        <span className="shrink-0 text-muted-foreground">· {statusDoProjeto(projeto.status)}</span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

function ItemDeOportunidade({ oportunidade: o }: { oportunidade: OportunidadeDaRelacao }) {
  const { byId } = useEmployeeDirectoryMap();
  const quem = o.owner_id ? byId.get(o.owner_id)?.nome ?? 'responsável' : 'sem responsável';
  const detalhe = [o.discard_reason && getDiscardReasonLabel(o.discard_reason), o.data && formatDate(o.data), quem].filter(Boolean).join(' · ');
  return (
    <li>
      <Link to={`/comercial/prospeccao?oportunidade=${encodeURIComponent(o.id)}`} className={LINK_DO_HISTORICO}>
        <span className="shrink-0 font-medium">{etapaDaOportunidade(o.stage)}</span>
        <span className="min-w-0 truncate text-muted-foreground">· {detalhe}</span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Identificacao({ empresa }: { empresa: EmpresaDaFicha }) {
  const anos = anosDeOperacao(empresa.data_inicio_atividade);
  const local = [emTitulo(empresa.municipio), empresa.uf].filter(Boolean).join(' · ');
  return (
    <Secao titulo="Identificação">
      <Itens>
        <Item rotulo="Natureza jurídica">{empresa.natureza_descricao ?? empresa.natureza_juridica ?? traco}</Item>
        <Item rotulo="Abertura">{empresa.data_inicio_atividade ? `${formatDate(empresa.data_inicio_atividade)}${anos != null ? ` · ${anos} anos` : ''}` : traco}</Item>
        <Item rotulo="Cidade">{local || traco}</Item>
        <Item rotulo="Distância de Formiga">{empresa.distancia_km != null ? `${empresa.distancia_km.toLocaleString('pt-BR')} km` : traco}</Item>
        <Item rotulo="Situação">Matriz ativa</Item>
      </Itens>
    </Secao>
  );
}

function Atividade({ empresa }: { empresa: EmpresaDaFicha }) {
  const [verSecundarias, setVerSecundarias] = useState(false);
  const setor = SETORES.find((s) => s.letra === setorDoCnae(empresa.cnae_principal))?.nome;
  const ramo = nomeDoRamo(divisaoDoCnae(empresa.cnae_principal));
  const n = empresa.secundarias.length;
  return (
    <Secao titulo="Atividade">
      <p className="text-[13.5px] leading-snug">
        <span className="font-mono text-[12.5px] text-muted-foreground">{rotuloDoCnae(empresa.cnae_principal)}</span>{' '}
        {empresa.cnae_descricao ?? ''}
      </p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">{[setor, ramo].filter(Boolean).join(' · ')}</p>
      {n > 0 && (
        <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-[12.5px]" aria-expanded={verSecundarias} onClick={() => setVerSecundarias((v) => !v)}>
          {verSecundarias ? 'Esconder' : 'Ver'} {n} atividade{n > 1 ? 's' : ''} secundária{n > 1 ? 's' : ''}
        </Button>
      )}
      {verSecundarias && (
        <ul className="mt-1.5 space-y-1 text-[12.5px]">
          {empresa.secundarias.map((a) => (
            <li key={a.codigo}><span className="font-mono text-muted-foreground">{rotuloDoCnae(a.codigo)}</span> {a.descricao ?? ''}</li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

function Tamanho({ empresa }: { empresa: EmpresaDaFicha }) {
  return (
    <Secao titulo="Tamanho">
      <Itens>
        <Item rotulo="Funcionários">
          {empresa.funcionarios != null ? empresa.funcionarios.toLocaleString('pt-BR') : traco}
          {empresa.funcionarios_do_time && <span className="text-muted-foreground"> · confirmados pelo time</span>}
        </Item>
        <Item rotulo="Unidades com funcionários">{empresa.unidades_com_funcionarios ?? traco}</Item>
        <Item rotulo="Filiais ativas">{empresa.filiais_ativas.toLocaleString('pt-BR')}</Item>
        <Item rotulo="Capital social">{empresa.capital_social ? reaisCurtos(Number(empresa.capital_social)) : traco}</Item>
      </Itens>
      <Faturamento empresa={empresa} />
    </Secao>
  );
}

function Faturamento({ empresa }: { empresa: EmpresaDaFicha }) {
  if (empresa.faturamento_informado != null) {
    const valor = Number(empresa.faturamento_informado);
    const rotulo = empresa.faturamento_informado_base ? ROTULO_DO_INFORMADO[empresa.faturamento_informado_base] : 'informado pelo time';
    return (
      <div className="mt-3 rounded-md border px-3 py-2.5">
        <p className="text-[13px]"><span className="font-mono text-[15px] font-semibold">{textoDoInformado(valor)}</span> · {rotulo}</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Valor informado pelo time.</p>
        {lucroRealPeloTime(valor) && <Aviso>{AVISO_LUCRO_REAL}</Aviso>}
      </div>
    );
  }
  const { faturamento_estimado: valor, faturamento_base: base } = empresa;
  if (valor == null || !base) return null;
  return (
    <div className="mt-3 rounded-md border px-3 py-2.5">
      <p className="text-[13px]"><span className="font-mono text-[15px] font-semibold">{textoDoFaturamento(Number(valor), base)}</span> · faturamento {ROTULO_DA_BASE[base]}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{contaDoFaturamento(empresa.cnae_principal, empresa.funcionarios, base, empresa.capital_social, empresa.funcionarios_do_time)}</p>
      {lucroRealProvavel(Number(valor), base) && <Aviso>{AVISO_LUCRO_REAL}</Aviso>}
    </div>
  );
}

function FitPorFrente({ empresa }: { empresa: EmpresaDaFicha }) {
  const fits = fitDaBase(empresa.cnae_principal, empresa.cnaes_secundarios, empresa.data_inicio_atividade, new Date().toISOString().slice(0, 10)) ?? [];
  return (
    <Secao titulo="Fit prévio por frente">
      <ul className="space-y-3">
        {fits.map((f) => (
          <li key={f.frente}>
            <p className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="font-medium">{f.rotulo}</span>
              <span className="font-mono font-semibold tabular-nums">{f.nota}</span>
            </p>
            <ul className="mt-1 space-y-0.5 text-[12.5px] text-muted-foreground">
              {f.motivos.map((m) => <li key={m.texto}>+{m.pontos} · {m.texto}</li>)}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-snug text-muted-foreground">{PENDENTES}</p>
    </Secao>
  );
}

function Divida({ empresa }: { empresa: EmpresaDaFicha }) {
  if (!empresa.divida_total) {
    return <Secao titulo="Dívida ativa da União"><p className="text-[13px] text-muted-foreground">Sem inscrição na dívida ativa (PGFN).</p></Secao>;
  }
  return (
    <Secao titulo="Dívida ativa da União">
      <Itens>
        <Item rotulo="Total">{reaisCurtos(Number(empresa.divida_total))}</Item>
        <Item rotulo="Em cobrança">{empresa.divida_em_cobranca ? reaisCurtos(Number(empresa.divida_em_cobranca)) : traco}</Item>
        <Item rotulo="Ajuizada">{empresa.divida_ajuizada ? reaisCurtos(Number(empresa.divida_ajuizada)) : traco}</Item>
        <Item rotulo="Inscrições">{empresa.inscricoes_divida ?? traco}</Item>
      </Itens>
      {!!empresa.divida_ajuizada && <Aviso alerta>{AVISO_FINEP}</Aviso>}
    </Secao>
  );
}

/** "(37) 3329-1000": a Receita guarda o DDD junto, só com dígitos. */
function telefoneFormatado(numero: string): string {
  const d = numero.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return numero;
}

const LINK = 'text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

/** E-mail e telefones da empresa na Receita, antes mesmo da oportunidade (18/11/2026). */
function Contato({ contato }: { contato: ContatoDaFicha | null }) {
  const telefones = [contato?.telefone_1, contato?.telefone_2].filter((t): t is string => !!t);
  return (
    <Secao titulo="Contato na Receita">
      <Itens>
        <Item rotulo="E-mail">
          {contato?.email ? <a href={`mailto:${contato.email.toLowerCase()}`} className={cn(LINK, 'break-all')}>{contato.email.toLowerCase()}</a> : traco}
        </Item>
        <Item rotulo={telefones.length > 1 ? 'Telefones' : 'Telefone'}>
          {telefones.length ? (
            <span className="flex flex-wrap gap-x-3">
              {telefones.map((t) => <a key={t} href={`tel:+55${t.replace(/\D/g, '')}`} className={cn(LINK, 'font-mono tabular-nums')}>{telefoneFormatado(t)}</a>)}
            </span>
          ) : traco}
        </Item>
      </Itens>
      <p className="mt-2 text-[12px] leading-snug text-muted-foreground">Contato que a empresa declarou à Receita; pode estar desatualizado ou ser do contador.</p>
    </Secao>
  );
}

function RedeEContato({ empresa, socios }: { empresa: EmpresaDaFicha; socios: SocioDaFicha[] }) {
  return (
    <Secao titulo={`Sócios e representantes (${empresa.socios.toLocaleString('pt-BR')})`}>
      {socios.length > 0 ? (
        <ul className="space-y-2">
          {socios.map((s) => <Socio key={`${s.nome}-${s.entrada}`} socio={s} />)}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">A Receita não lista sócios para esta empresa.</p>
      )}
      {empresa.socios > socios.length && socios.length > 0 && (
        <p className="mt-2 text-[12px] text-muted-foreground">Mostrando os {socios.length} primeiros, com quem administra no topo.</p>
      )}
    </Secao>
  );
}

/** A base guarda só a raiz (8 dígitos) do CNPJ do sócio empresa: "17.125.387/…". */
const raizDoCnpj = (raiz: string) => `${raiz.slice(0, 2)}.${raiz.slice(2, 5)}.${raiz.slice(5, 8)}/…`;

function Socio({ socio }: { socio: SocioDaFicha }) {
  const qualificacao = nomeDaQualificacao(socio.qualificacao_codigo);
  const desde = socio.entrada ? `desde ${socio.entrada.slice(0, 4)}` : null;
  return (
    <li className="text-[13px] leading-snug">
      <span className="font-medium">{emTitulo(socio.nome)}</span>
      <span className="block text-[12px] text-muted-foreground">
        {[qualificacao, socio.cnpj ? `CNPJ ${raizDoCnpj(socio.cnpj)}` : null, desde].filter(Boolean).join(' · ')}
      </span>
    </li>
  );
}
