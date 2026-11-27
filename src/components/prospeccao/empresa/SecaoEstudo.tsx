import { useEffect, useRef, useState } from 'react';
import { Link2, Loader2, StickyNote, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useAnexarArquivo, useItensDoEstudo, usePastaDoComercial } from '@/hooks/useItensDoEstudo';
import { useMicrosoftConnection } from '@/hooks/useMicrosoftGraph';
import { useCamposDaEmpresa } from '@/hooks/usePaginaDaEmpresa';
import { CAMPO_DA_EMPRESA, SECAO_DA_EMPRESA, TAMANHO_MAXIMO_DO_ARQUIVO, TIPO_DE_ITEM_DO_ESTUDO } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { ProspectCompanyDB } from '@/types/prospect';
import { Bloco, Secao } from './PecasDaPagina';
import { ListaDoEstudo, NovaNota, NovoLink } from './ItensDoEstudo';
import { useEdicaoDaEmpresa } from './edicaoDaEmpresa';

type Formulario = typeof TIPO_DE_ITEM_DO_ESTUDO.LINK | typeof TIPO_DE_ITEM_DO_ESTUDO.NOTA | null;

/** Síntese da pesquisa: salva ao sair do campo; o "Preencher" do widget leva até ela. */
function Sintese({ empresa, podeEditar }: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const salvar = useCamposDaEmpresa();
  const { editando, editar } = useEdicaoDaEmpresa();
  const [texto, setTexto] = useState(empresa.notes ?? '');
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTexto(empresa.notes ?? '');
  }, [empresa.notes]);
  useEffect(() => {
    if (editando !== CAMPO_DA_EMPRESA.SINTESE) return;
    campo.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    campo.current?.focus();
    editar(null);
  }, [editando, editar]);
  const gravar = () => {
    if (texto.trim() !== (empresa.notes ?? '').trim()) salvar.mutate({ id: empresa.id, campos: { notes: texto } });
  };
  return (
    <Textarea
      ref={campo}
      id={`campo-${CAMPO_DA_EMPRESA.SINTESE}`}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={gravar}
      disabled={!podeEditar}
      aria-label="Síntese da pesquisa sobre a empresa"
      className="min-h-[120px] bg-card text-[13.5px] leading-relaxed"
    />
  );
}

/** Arquivo do estudo, para a pasta da empresa no OneDrive do Comercial. */
function BotaoDeArquivo({ empresa }: { empresa: ProspectCompanyDB }) {
  const entrada = useRef<HTMLInputElement>(null);
  const { data: comercial, isLoading } = usePastaDoComercial();
  const microsoft = useMicrosoftConnection();
  const anexar = useAnexarArquivo(empresa);
  const escolher = () => (microsoft.isConnected ? entrada.current?.click() : microsoft.connect());
  const enviar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_DO_ARQUIVO) return toast({ title: 'Arquivo acima de 100 MB', variant: 'destructive' });
    anexar.mutate(arquivo);
  };
  const semPasta = !isLoading && !comercial;
  const botao = (
    <Button variant="outline" size="sm" onClick={escolher} disabled={semPasta || anexar.isPending || microsoft.isConnecting}>
      {anexar.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
      Arquivo
    </Button>
  );
  return (
    <>
      {semPasta ? (
        <Tooltip>
          <TooltipTrigger asChild><span tabIndex={0}>{botao}</span></TooltipTrigger>
          <TooltipContent>O admin escolhe a pasta do Comercial em Configurações › Integrações</TooltipContent>
        </Tooltip>
      ) : botao}
      <input ref={entrada} type="file" className="hidden" onChange={enviar} aria-hidden="true" tabIndex={-1} />
    </>
  );
}

function Acoes(props: { empresa: ProspectCompanyDB; onAbrir: (f: Formulario) => void }) {
  const { empresa, onAbrir } = props;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onAbrir(TIPO_DE_ITEM_DO_ESTUDO.LINK)}>
        <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Link
      </Button>
      <BotaoDeArquivo empresa={empresa} />
      <Button variant="outline" size="sm" onClick={() => onAbrir(TIPO_DE_ITEM_DO_ESTUDO.NOTA)}>
        <StickyNote className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Nota
      </Button>
    </div>
  );
}

/** Links, arquivos e notas juntados à mão, com os botões de incluir no cabeçalho do cartão. */
function Materiais({ empresa, podeEditar }: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const [formulario, setFormulario] = useState<Formulario>(null);
  const { data: itens = [] } = useItensDoEstudo(empresa.id);
  const fechar = () => setFormulario(null);
  return (
    <Bloco titulo="Materiais" acao={podeEditar ? <Acoes empresa={empresa} onAbrir={setFormulario} /> : undefined}>
      {formulario === TIPO_DE_ITEM_DO_ESTUDO.LINK && <NovoLink companyId={empresa.id} onFechar={fechar} />}
      {formulario === TIPO_DE_ITEM_DO_ESTUDO.NOTA && <NovaNota companyId={empresa.id} onFechar={fechar} />}
      {itens.length ? <ListaDoEstudo companyId={empresa.id} itens={itens} podeEditar={podeEditar} embutida /> : <p className="text-sm text-muted-foreground">—</p>}
    </Bloco>
  );
}

/**
 * Estudo da conta (US-0053): a síntese e os materiais (links, notas e arquivos) da pesquisa sobre a
 * empresa, cada um no seu cartão. Os arquivos ficam numa pasta da empresa no OneDrive do Comercial.
 * Os insights de IA têm aba própria (US-0057).
 */
export function SecaoEstudo({ empresa }: { empresa: ProspectCompanyDB }) {
  const { can } = useAuth();
  const podeEditar = can('prospeccao:editar');
  return (
    <Secao id={SECAO_DA_EMPRESA.ESTUDO} titulo="Estudo da conta">
      <Bloco titulo="Síntese">
        <Sintese empresa={empresa} podeEditar={podeEditar} />
      </Bloco>
      <Materiais empresa={empresa} podeEditar={podeEditar} />
    </Secao>
  );
}
