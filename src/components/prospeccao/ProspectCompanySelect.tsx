import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Loader2, Plus, Search, Briefcase, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchClientsForProspect, useSearchProspectCompanies } from '@/hooks/useProspectCompanies';
import { formatCNPJ, validateCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import type { ClientOption, CompanyPrefill } from '@/types/cnpjLookup';
import type { ProspectCompanyDB } from '@/types/prospect';

interface ProspectCompanySelectProps {
  value: ProspectCompanyDB | null;
  onChange: (company: ProspectCompanyDB | null) => void;
  /** Abre o cadastro de empresa nova, já preenchido com o que se sabe dela. */
  onCreateNew: (prefill: CompanyPrefill) => void;
  disabled?: boolean;
}

/**
 * Escolhe a empresa do contato por um de três caminhos (29/09/2026):
 *
 *   1. empresa que já está na Prospecção — reaproveitada, nada é redigitado;
 *   2. cliente da carteira — liga a empresa ao cliente (`client_id`), e o CNPJ vem de lá;
 *   3. CNPJ que ninguém tem ainda — consulta a base pública e abre o cadastro preenchido.
 *
 * A ordem é a da deduplicação: o que já existe vem antes do que se cria.
 */
export function ProspectCompanySelect(props: ProspectCompanySelectProps) {
  const { value, onChange, onCreateNew, disabled } = props;
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const termo = busca.trim();

  const escolher = (empresa: ProspectCompanyDB) => {
    onChange(empresa);
    setOpen(false);
  };
  const cadastrar = (prefill: CompanyPrefill) => {
    onCreateNew(prefill);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 px-3"
          disabled={disabled}
        >
          <span className={cn('truncate text-sm flex items-center gap-2', !value && 'text-muted-foreground')}>
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {value?.name ?? 'Buscar empresa, cliente ou CNPJ'}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                aria-label="Limpar empresa"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nome, cliente ou CNPJ..."
            value={busca}
            onValueChange={setBusca}
          />
          <CommandList className="max-h-72 overflow-y-auto">
            {termo.length < 2 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Digite ao menos 2 letras, ou o CNPJ completo.
              </div>
            ) : (
              <Resultados
                termo={termo}
                selecionada={value}
                onEscolher={escolher}
                onCadastrar={cadastrar}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ResultadosProps {
  termo: string;
  selecionada: ProspectCompanyDB | null;
  onEscolher: (empresa: ProspectCompanyDB) => void;
  onCadastrar: (prefill: CompanyPrefill) => void;
}

function Resultados(props: ResultadosProps) {
  const { termo, selecionada, onEscolher, onCadastrar } = props;
  const { empresas, clientes, carregando, nada } = useResultados(termo);

  return (
    <>
      {carregando && <div className="px-3 py-4 text-sm text-muted-foreground">Buscando...</div>}
      {nada && <CommandEmpty>Nenhuma empresa ou cliente encontrado.</CommandEmpty>}
      <GrupoEmpresas empresas={empresas} selecionada={selecionada} onEscolher={onEscolher} />
      <GrupoClientes clientes={clientes} onEscolher={onEscolher} onCadastrar={onCadastrar} />
      <BuscaNaReceita termo={termo} semResultado={nada} onCadastrar={onCadastrar} />
      <CadastrarPeloNome termo={termo} empresas={empresas} onCadastrar={onCadastrar} />
    </>
  );
}

function useResultados(termo: string) {
  const empresas = useSearchProspectCompanies(termo);
  const clientes = useSearchClientsForProspect(termo);
  const listaEmpresas = empresas.data ?? [];
  // Cliente que já tem empresa na Prospecção aparece como empresa, não duas vezes.
  const ligados = new Set(listaEmpresas.map((e) => e.client_id).filter(Boolean));
  const listaClientes = (clientes.data ?? []).filter((c) => !ligados.has(c.id));
  const carregando = empresas.isLoading || clientes.isLoading;
  return {
    empresas: listaEmpresas,
    clientes: listaClientes,
    carregando,
    nada: !carregando && listaEmpresas.length === 0 && listaClientes.length === 0,
  };
}

function CadastrarPeloNome(props: {
  termo: string;
  empresas: ProspectCompanyDB[];
  onCadastrar: (prefill: CompanyPrefill) => void;
}) {
  const { termo, empresas, onCadastrar } = props;
  const jaExiste = empresas.some((e) => e.name.trim().toLowerCase() === termo.toLowerCase());
  if (jaExiste || ehCnpj(termo)) return null;
  return (
    <CommandGroup>
      <CommandItem value={`__nova__${termo}`} onSelect={() => onCadastrar({ name: termo })}>
        <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
        Cadastrar &ldquo;{termo}&rdquo;
      </CommandItem>
    </CommandGroup>
  );
}

function GrupoEmpresas(props: {
  empresas: ProspectCompanyDB[];
  selecionada: ProspectCompanyDB | null;
  onEscolher: (empresa: ProspectCompanyDB) => void;
}) {
  const { empresas, selecionada, onEscolher } = props;
  if (empresas.length === 0) return null;
  return (
    <CommandGroup heading="Empresas da Prospecção">
      {empresas.map((empresa) => (
        <CommandItem key={empresa.id} value={empresa.id} onSelect={() => onEscolher(empresa)}>
          <Check
            className={cn('mr-2 h-4 w-4 shrink-0', selecionada?.id === empresa.id ? 'opacity-100' : 'opacity-0')}
            aria-hidden="true"
          />
          <NomeECnpj nome={empresa.name} cnpj={empresa.cnpj} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/**
 * Cliente escolhido: se alguém já o ligou a uma empresa da Prospecção entre a busca e o
 * clique, usa essa; senão abre o cadastro com nome, CNPJ e vínculo preenchidos.
 */
function GrupoClientes(props: {
  clientes: ClientOption[];
  onEscolher: (empresa: ProspectCompanyDB) => void;
  onCadastrar: (prefill: CompanyPrefill) => void;
}) {
  const { clientes, onEscolher, onCadastrar } = props;
  const { employee } = useAuth();
  if (clientes.length === 0) return null;

  const usarCliente = async (cliente: ClientOption) => {
    const existente = employee
      ? await prospectCompanyService.findByClientId(cliente.id, employee.tenant_id).catch(() => null)
      : null;
    if (existente) return onEscolher(existente);
    onCadastrar({
      name: cliente.trading_name || cliente.company_name,
      cnpj: cliente.cnpj?.replace(/\D/g, '') || null,
      client_id: cliente.id,
    });
  };

  return (
    <CommandGroup heading="Clientes">
      {clientes.map((cliente) => (
        <CommandItem key={cliente.id} value={`__cliente__${cliente.id}`} onSelect={() => usarCliente(cliente)}>
          <Briefcase className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <NomeECnpj nome={cliente.trading_name || cliente.company_name} cnpj={cliente.cnpj} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/** CNPJ completo e válido que ninguém tem: consulta a base pública e abre o cadastro. */
function BuscaNaReceita(props: {
  termo: string;
  semResultado: boolean;
  onCadastrar: (prefill: CompanyPrefill) => void;
}) {
  const { termo, semResultado, onCadastrar } = props;
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!ehCnpj(termo) || !semResultado) return null;

  const consultar = async () => {
    setConsultando(true);
    setErro(null);
    try {
      const dado = await lookupCnpj(termo);
      onCadastrar({ name: dado.nomeFantasia ?? dado.razaoSocial, cnpj: dado.cnpj, segment: dado.segmento, receita: dado });
    } catch (e) {
      setErro(e instanceof CnpjLookupError ? e.message : 'Não foi possível consultar o CNPJ.');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <CommandGroup heading="CNPJ sem cadastro">
      <CommandItem value={`__cnpj__${termo}`} onSelect={consultar} disabled={consultando}>
        {consultando ? (
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        Buscar {formatCNPJ(termo)} na Receita
      </CommandItem>
      {erro && (
        <div role="alert" className="px-3 pb-2 text-xs text-destructive">
          {erro}{' '}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => onCadastrar({ name: '', cnpj: termo.replace(/\D/g, '') })}
          >
            Cadastrar à mão
          </button>
        </div>
      )}
    </CommandGroup>
  );
}

function NomeECnpj({ nome, cnpj }: { nome: string; cnpj: string | null }) {
  return (
    <span className="flex flex-col min-w-0">
      <span className="truncate">{nome}</span>
      {cnpj && <span className="text-xs text-muted-foreground">{formatCNPJ(cnpj)}</span>}
    </span>
  );
}

function ehCnpj(termo: string): boolean {
  const digitos = termo.replace(/\D/g, '');
  return digitos.length === 14 && validateCNPJ(digitos);
}
