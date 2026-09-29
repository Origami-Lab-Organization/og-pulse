import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useMarkProspectWon } from '@/hooks/useProspects';
import { ProspectProjectDialog } from './ProspectProjectDialog';
import { toISODate, type ProspectStage, type ProspectWithCompany } from '@/types/prospect';

const ETAPA_GANHO: ProspectStage = 'ganho';

interface ProspectWonDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Fechamos negócio: registra o dia e o valor vendido (28/09/2026).
 *
 * O valor pode ficar para depois — quem fecha na call nem sempre tem o número final —, mas
 * pular é uma escolha visível: o card fica sinalizado "Sem valor" até alguém preencher, em
 * vez de o ganho entrar como R$ 0 e puxar o ticket médio para baixo em silêncio.
 * Aberto num contato que já está em Ganho, corrige data e valor.
 *
 * Ganho novo oferece criar o projeto na sequência (29/09/2026) — era o "Fechar negócio" das
 * Oportunidades. É oferta, não passo obrigatório: quem ainda não tem data de início fecha e
 * cria depois pela ficha do contato.
 */
export function ProspectWonDialog(props: ProspectWonDialogProps) {
  const { prospect, open, onOpenChange } = props;
  const registrar = useMarkProspectWon();
  const [data, setData] = useState(toISODate(new Date()));
  const [valor, setValor] = useState(0);
  // Cópia do contato ganho: o pai zera `prospect` ao fechar, e a oferta vem depois.
  const [ganho, setGanho] = useState<ProspectWithCompany | null>(null);
  const [projetoAberto, setProjetoAberto] = useState(false);
  const { can } = useAuth();

  useEffect(() => {
    if (!open || !prospect) return;
    setData(prospect.won_on ?? toISODate(new Date()));
    setValor(prospect.won_value ?? 0);
  }, [open, prospect]);

  const posGanho = (
    <>
      <OfertaDeProjeto
        aberta={!!ganho && !projetoAberto}
        onAgoraNao={() => setGanho(null)}
        onCriar={() => setProjetoAberto(true)}
      />
      <ProspectProjectDialog
        prospect={ganho}
        open={projetoAberto}
        onOpenChange={(aberto) => {
          setProjetoAberto(aberto);
          if (!aberto) setGanho(null);
        }}
      />
    </>
  );

  if (!prospect) return posGanho;

  const editando = !!prospect.won_on;

  const salvar = (comValor: boolean) =>
    registrar.mutate(
      { id: prospect.id, wonOn: data, value: comValor ? valor : null },
      {
        onSuccess: () => {
          onOpenChange(false);
          if (!editando && can('projeto:editar')) {
            setGanho({ ...prospect, stage: ETAPA_GANHO, won_on: data, won_value: comValor ? valor : null });
          }
        },
      },
    );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar ganho' : 'Registrar ganho'}</DialogTitle>
          <DialogDescription>{descricaoDe(prospect)}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ganho-data">Data do fechamento</Label>
            <Input
              id="ganho-data"
              type="date"
              value={data}
              max={toISODate(new Date())}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ganho-valor">Valor vendido</Label>
            <CurrencyInput id="ganho-valor" value={valor} onValueChange={setValor} showPrefix />
          </div>
        </div>

        <Rodape
          pendente={registrar.isPending}
          semData={!data}
          semValor={valor <= 0}
          editando={editando}
          onSemValor={() => salvar(false)}
          onSalvar={() => salvar(true)}
          onCancelar={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>

      {posGanho}
    </>
  );
}

function descricaoDe(prospect: ProspectWithCompany): string {
  const empresa = prospect.company?.name ? ` · ${prospect.company.name}` : '';
  return `${prospect.contact_name}${empresa}. O cliente aceitou a proposta.`;
}

interface RodapeProps {
  pendente: boolean;
  semData: boolean;
  semValor: boolean;
  editando: boolean;
  onSemValor: () => void;
  onSalvar: () => void;
  onCancelar: () => void;
}

function Rodape(props: RodapeProps) {
  const { pendente, semData, semValor, editando, onSemValor, onSalvar, onCancelar } = props;
  const rotulo = editando ? 'Salvar' : 'Registrar ganho';
  return (
    <DialogFooter className="gap-2 sm:justify-between">
      <Button variant="ghost" onClick={onSemValor} disabled={pendente || semData}>
        Registrar sem valor
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancelar} disabled={pendente}>
          Cancelar
        </Button>
        <Button onClick={onSalvar} disabled={pendente || semData || semValor}>
          {pendente ? 'Salvando...' : rotulo}
        </Button>
      </div>
    </DialogFooter>
  );
}

function OfertaDeProjeto(props: { aberta: boolean; onAgoraNao: () => void; onCriar: () => void }) {
  const { aberta, onAgoraNao, onCriar } = props;
  return (
    <Dialog open={aberta} onOpenChange={(v) => !v && onAgoraNao()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ganho registrado</DialogTitle>
          <DialogDescription>
            Quer criar o projeto agora? Com orçamento vinculado, equipe, fornecedores e materiais vêm dele.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onAgoraNao}>Agora não</Button>
          <Button onClick={onCriar}>Criar projeto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
