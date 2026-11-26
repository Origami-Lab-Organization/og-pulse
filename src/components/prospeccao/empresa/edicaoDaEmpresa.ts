import { createContext, useContext, useEffect, useRef } from 'react';
import { SECAO_DA_EMPRESA, type CampoDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { EdicaoDaEmpresa } from '@/types/paginaDaEmpresa';

const NADA: EdicaoDaEmpresa = {
  editando: null,
  editar: () => undefined,
  widgetAberto: false,
  abrirWidget: () => undefined,
  aba: SECAO_DA_EMPRESA.QUALIFICACAO,
  mostrar: () => undefined,
};

/** O "Preencher" do widget abre a aba e o campo certos; o selo do tipo reabre o widget (US-0053). */
export const EdicaoDaEmpresaContext = createContext<EdicaoDaEmpresa>(NADA);

export const useEdicaoDaEmpresa = () => useContext(EdicaoDaEmpresaContext);

/** O campo está aberto para edição? Abrir pelo widget leva a página até ele. */
export function useCampoAberto(campo: CampoDaEmpresa) {
  const { editando, editar } = useEdicaoDaEmpresa();
  const aberto = editando === campo;
  const ancora = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aberto) ancora.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [aberto]);
  return { aberto, ancora, abrir: () => editar(campo), fechar: () => editar(null) };
}
