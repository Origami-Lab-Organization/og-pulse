import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import { saveCompanyReceita } from '@/services/receitaService';
import type { BulkRow } from '@/types/bulkImport';

/** Duas consultas por vez e uma pausa entre elas: a BrasilAPI é pública e limita por minuto. */
const SIMULTANEAS = 2;
const PAUSA_MS = 350;
const DUPLICADO = '23505';

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cadastro de empresas em lote pelo CNPJ (29/09/2026).
 *
 * Cada CNPJ passa pelo mesmo caminho do cadastro de um: consulta a Receita, cria a empresa
 * com nome e segmento de lá e grava o retrato e a rede de sócios (`save_prospect_company_receita`).
 * O que já existe no tenant não é recriado nem sobrescrito. Nenhum contato é criado: quem
 * abordar é escolha de quem conduz ("Virar contato" na rede da empresa).
 */
export function useBulkCompanyImport() {
  const { employee } = useAuth();
  const qc = useQueryClient();
  const [linhas, setLinhas] = useState<BulkRow[]>([]);
  const [rodando, setRodando] = useState(false);
  const parar = useRef(false);

  const atualizar = (cnpj: string, mudanca: Partial<BulkRow>) =>
    setLinhas((atual) => atual.map((l) => (l.cnpj === cnpj ? { ...l, ...mudanca } : l)));

  const processar = async (cnpj: string, origem: string | null) => {
    atualizar(cnpj, { status: 'consultando' });
    try {
      const receita = await lookupCnpj(cnpj);
      const empresa = await prospectCompanyService.create(
        {
          name: receita.nomeFantasia ?? receita.razaoSocial,
          cnpj,
          segment: receita.segmento,
          notes: origem ? `Origem da lista: ${origem}` : null,
        },
        employee!.tenant_id,
        employee!.id,
      );
      try {
        await saveCompanyReceita(empresa.id, receita);
        atualizar(cnpj, { status: 'criada', empresa, socios: receita.socios.length });
      } catch {
        atualizar(cnpj, { status: 'criada', empresa, mensagem: 'sem os dados da Receita — use "Atualizar" na ficha' });
      }
    } catch (erro) {
      atualizar(cnpj, falhaDe(erro));
    }
  };

  const iniciar = async (cnpjs: string[], origem: string | null) => {
    if (!employee || cnpjs.length === 0) return;
    parar.current = false;
    setRodando(true);
    try {
      const existentes = await prospectCompanyService.findByCnpjs(cnpjs, employee.tenant_id);
      const porCnpj = new Map(existentes.map((e) => [e.cnpj, e]));
      setLinhas(
        cnpjs.map((cnpj) => {
          const empresa = porCnpj.get(cnpj);
          return empresa ? { cnpj, status: 'existente', empresa } : { cnpj, status: 'fila' };
        }),
      );
      const fila = cnpjs.filter((c) => !porCnpj.has(c));
      await Promise.all(Array.from({ length: SIMULTANEAS }, () => trabalhar(fila, origem)));
    } finally {
      setRodando(false);
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
    }
  };

  // Cada trabalhador tira o próximo da fila compartilhada até ela acabar ou a pessoa parar.
  const trabalhar = async (fila: string[], origem: string | null) => {
    while (fila.length > 0 && !parar.current) {
      const cnpj = fila.shift()!;
      await processar(cnpj, origem);
      await esperar(PAUSA_MS); // harness-ok: pausa proposital entre consultas (limite da BrasilAPI)
    }
  };

  const reiniciar = () => setLinhas([]);
  const interromper = () => {
    parar.current = true;
  };

  return { linhas, rodando, iniciar, interromper, reiniciar };
}

function falhaDe(erro: unknown): Partial<BulkRow> {
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo === DUPLICADO) return { status: 'existente', mensagem: 'cadastrada por outra pessoa agora há pouco' };
  const mensagem = erro instanceof CnpjLookupError ? erro.message : mensagemParaUsuario(erro);
  return { status: 'falhou', mensagem };
}
