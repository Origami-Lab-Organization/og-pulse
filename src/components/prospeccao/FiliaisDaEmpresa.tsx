import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useFiliaisDaEmpresa } from '@/hooks/useProspectCompanies';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCNPJ } from '@/lib/masks';
import { validarFilial } from '@/lib/prospecting/filiais';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import type { ProspectCompanyDB } from '@/types/prospect';

interface Juncao {
  outra: ProspectCompanyDB;
}

function ChipDaFilial(props: { cnpj: string; podeEditar: boolean; onRemover: () => void }) {
  const { cnpj, podeEditar, onRemover } = props;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs tabular-nums">
      {formatCNPJ(cnpj)}
      {podeEditar && (
        <button type="button" onClick={onRemover} aria-label={`Remover a filial ${formatCNPJ(cnpj)}`} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

function ConfirmarJuncao(props: { juncao: Juncao | null; empresa: string; pendente: boolean; onConfirmar: () => void; onCancelar: () => void }) {
  const { juncao, empresa, pendente, onConfirmar, onCancelar } = props;
  return (
    <AlertDialog open={juncao !== null} onOpenChange={(aberto) => !aberto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Juntar {juncao?.outra.name} a {empresa}?</AlertDialogTitle>
          <AlertDialogDescription>
            As Oportunidades, os contatos e o cliente de {juncao?.outra.name} passam para {empresa}, e o CNPJ
            dela vira filial. {juncao?.outra.name} deixa de existir como empresa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar} disabled={pendente}>
            {pendente && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Juntar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NovaFilial(props: { onAdicionar: (valor: string) => void; onCancelar: () => void; erro: string | null; pendente: boolean }) {
  const { onAdicionar, onCancelar, erro, pendente } = props;
  const [valor, setValor] = useState('');
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={valor}
          onChange={(e) => setValor(formatCNPJ(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && onAdicionar(valor)}
          placeholder="00.000.000/0000-00"
          aria-label="CNPJ da filial"
          aria-invalid={erro !== null}
          className="h-7 max-w-[190px] font-mono text-xs"
        />
        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => onAdicionar(valor)} disabled={pendente}>
          {pendente ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : 'Adicionar'}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancelar}>Cancelar</Button>
      </div>
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

function useFiliais(empresa: ProspectCompanyDB) {
  const { employee } = useAuth();
  const { salvar, juntar } = useFiliaisDaEmpresa();
  const [erro, setErro] = useState<string | null>(null);
  const [juncao, setJuncao] = useState<Juncao | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const filiais = empresa.filiais ?? [];
  const falhou = (e: unknown) => toast({ title: mensagemParaUsuario(e, 'Não foi possível salvar a filial.'), variant: 'destructive' });

  const gravar = (lista: string[]) => salvar.mutate({ id: empresa.id, filiais: lista }, { onError: falhou, onSuccess: () => setAdicionando(false) });

  const adicionar = async (valor: string) => {
    const filial = validarFilial(valor, empresa.cnpj ?? '', filiais);
    setErro(filial.erro);
    if (!filial.cnpj || !employee?.tenant_id) return;
    const outra = await prospectCompanyService.findByAnyCnpj(filial.cnpj, employee.tenant_id).catch(() => null);
    if (outra && outra.id !== empresa.id) return setJuncao({ outra });
    gravar([...filiais, filial.cnpj]);
  };

  const confirmarJuncao = () => {
    if (!juncao) return;
    juntar.mutate({ de: juncao.outra.id, para: empresa.id }, {
      onError: falhou,
      onSuccess: () => { setJuncao(null); setAdicionando(false); },
    });
  };

  return {
    filiais, erro, juncao, adicionando, setAdicionando, adicionar, confirmarJuncao,
    remover: (cnpj: string) => gravar(filiais.filter((f) => f !== cnpj)),
    cancelarJuncao: () => setJuncao(null),
    cancelarNova: () => { setAdicionando(false); setErro(null); },
    pendente: salvar.isPending || juntar.isPending,
  };
}

/**
 * Filiais na ficha da empresa (US-0050): a empresa é a matriz; a ficha guarda os CNPJs das filiais,
 * só de mesma raiz. Filial que já é empresa no Pulse é juntada à matriz, com confirmação.
 */
export function FiliaisDaEmpresa(props: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const { empresa, podeEditar } = props;
  const f = useFiliais(empresa);
  const podeAdicionar = podeEditar && Boolean(empresa.cnpj);
  if (f.filiais.length === 0 && !podeAdicionar) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1.5">
      {f.filiais.map((cnpj) => (
        <ChipDaFilial key={cnpj} cnpj={cnpj} podeEditar={podeEditar} onRemover={() => f.remover(cnpj)} />
      ))}
      {podeAdicionar && !f.adicionando && (
        <Button type="button" variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs font-normal" onClick={() => f.setAdicionando(true)}>
          <Plus className="h-3 w-3" aria-hidden="true" />
          Filial
        </Button>
      )}
      {f.adicionando && <NovaFilial onAdicionar={f.adicionar} onCancelar={f.cancelarNova} erro={f.erro} pendente={f.pendente} />}
      <ConfirmarJuncao juncao={f.juncao} empresa={empresa.name} pendente={f.pendente} onConfirmar={f.confirmarJuncao} onCancelar={f.cancelarJuncao} />
    </div>
  );
}
