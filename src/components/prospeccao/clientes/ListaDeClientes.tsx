import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCarteiraDeClientes } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { rotaDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { DIGITOS_DO_CNPJ } from '@/lib/prospecting/filiais';
import { RELACOES_DA_CARTEIRA } from '@/lib/carteira.constants';
import { clienteNaBusca, relacaoDoCliente } from '@/lib/carteira';
import { rotuloDaRelacao } from '@/lib/prospecting/relacao';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import type { ClienteDaCarteira } from '@/services/clientService';
import type { Relacao } from '@/types/relacao';
import { SeloDeRelacao } from '@/components/prospeccao/receita/SeloDeRelacao';
import { EstadoVazio } from '@/components/prospeccao/ListaDeCadastro';

/** Filtro de relação: todas, ou uma delas. */
function FiltroDeRelacao(props: { valor: Relacao | null; onChange: (valor: Relacao | null) => void; contagem: Record<string, number> }) {
  const { valor, onChange, contagem } = props;
  const opcoes: ReadonlyArray<{ valor: Relacao | null; rotulo: string; n: number }> = [
    { valor: null, rotulo: 'Todas', n: Object.values(contagem).reduce((a, b) => a + b, 0) },
    ...RELACOES_DA_CARTEIRA.map((r) => ({ valor: r, rotulo: rotuloDaRelacao(r), n: contagem[r] ?? 0 })),
  ];
  return (
    <div role="radiogroup" aria-label="Relação com a Origami" className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button
          key={o.rotulo}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            valor === o.valor ? 'border-primary bg-accent-subtle text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.rotulo}
          <span className="text-muted-foreground">{o.n}</span>
        </button>
      ))}
    </div>
  );
}

function LinhaDoCliente(props: { cliente: ClienteDaCarteira; onAbrir: (cliente: ClienteDaCarteira) => void }) {
  const { cliente, onAbrir } = props;
  const cidade = [cliente.cidade, cliente.estado].filter(Boolean).join('/');
  return (
    <tr
      tabIndex={0}
      onClick={() => onAbrir(cliente)}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir(cliente)}
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <td className="px-5 py-2">
        <div className="max-w-[320px] truncate font-semibold leading-snug" title={cliente.razao_social}>{cliente.nome}</div>
        <div className="mt-0.5 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
          {cliente.cnpj ? formatCNPJ(cliente.cnpj) : '—'}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2"><SeloDeRelacao relacao={relacaoDoCliente(cliente)} /></td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {cliente.projetos_ativos} / {cliente.projetos}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{cidade || '—'}</td>
    </tr>
  );
}

function TabelaDeClientes(props: { clientes: ClienteDaCarteira[]; onAbrir: (cliente: ClienteDaCarteira) => void }) {
  const { clientes, onAbrir } = props;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
        <caption className="sr-only">Clientes da Origami</caption>
        <thead>
          <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] font-medium text-muted-foreground">
            <th scope="col" className="px-5 font-medium">Empresa</th>
            <th scope="col" className="px-3 font-medium">Relação</th>
            <th scope="col" className="px-3 text-center font-medium">Projetos ativos / total</th>
            <th scope="col" className="px-3 font-medium">Cidade</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => <LinhaDoCliente key={c.client_id} cliente={c} onAbrir={onAbrir} />)}
        </tbody>
      </table>
    </div>
  );
}

function Carregando() {
  return (
    <div className="space-y-2 p-5">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

/**
 * Aba Clientes da tela Empresas (US-0049): a carteira — empresas com Ganho ou projeto (ADR-0056).
 * Quem só tem `cliente:ler` vê só esta aba. A linha abre a ficha do cliente.
 */
export function ListaDeClientes() {
  const navigate = useNavigate();
  const { data: carteira = [], isLoading } = useCarteiraDeClientes();
  const [busca, setBusca] = useState('');
  const [relacao, setRelacao] = useState<Relacao | null>(null);

  const naBusca = useMemo(() => carteira.filter((c) => clienteNaBusca(c, busca)), [carteira, busca]);
  const contagem = useMemo(
    () => Object.fromEntries(RELACOES_DA_CARTEIRA.map((r) => [r, naBusca.filter((c) => c.relacao === r).length])),
    [naBusca],
  );
  const visiveis = relacao ? naBusca.filter((c) => c.relacao === relacao) : naBusca;
  const { can } = useAuth();
  // US-0053: com a Prospecção, o cliente abre na página da empresa; só com a carteira, na ficha do cliente.
  const abrir = (c: ClienteDaCarteira) => {
    const cnpj = (c.cnpj ?? '').replace(/\D/g, '');
    if (can('prospeccao:ler') && cnpj.length === DIGITOS_DO_CNPJ) navigate(rotaDaEmpresa(cnpj), { state: { de: 'clientes' } });
    else navigate(`/clients/${c.client_id}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, CNPJ ou cidade"
            aria-label="Buscar cliente"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <FiltroDeRelacao valor={relacao} onChange={setRelacao} contagem={contagem} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading && <Carregando />}
        {!isLoading && visiveis.length === 0 && (
          <EstadoVazio titulo="Nenhum cliente" texto={busca || relacao !== null ? 'Nada com esses filtros.' : 'A carteira está vazia.'} />
        )}
        {!isLoading && visiveis.length > 0 && <TabelaDeClientes clientes={visiveis} onAbrir={abrir} />}
      </div>
    </div>
  );
}
