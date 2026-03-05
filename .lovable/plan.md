

## Plano: Corrigir Stepper, Adaptar Wizard por Tipo de Contratação

### Problemas Identificados

1. **Stepper quebrado**: Layout horizontal com `flex` + `overflow-x-auto` quebra em telas menores. Precisa ser centralizado e responsivo.
2. **Aviso prévio para Estágio/PJ**: Step 2 mostra cálculo de aviso prévio mesmo para contratos que não têm esse direito.
3. **Folha de pagamento genérica**: Step 3 calcula férias, 13º, FGTS para todos os tipos — Estágio só tem acerto de férias/bolsa; PJ tem apenas o previsto em contrato; Sócio tem regras próprias; Menor Aprendiz segue CLT parcial.
4. **Documentos genéricos**: Step 4 exibe o mesmo checklist para todos os tipos, sem distinguir obrigatórios de opcionais por contratação.

### Mudanças Planejadas

#### 1. Stepper Centralizado e Responsivo (`TerminationWizardModal.tsx`)
- Substituir o stepper inline por um layout centralizado com `justify-center`
- Em mobile: mostrar apenas o número do step atual (ex: "Etapa 2 de 5") ao invés da barra completa
- Skipping dinâmico: para Estágio e PJ, o step de Aviso Prévio será pulado automaticamente (stepper mostra 4 etapas ao invés de 5)

#### 2. Aviso Prévio Condicional (`TerminationStep2Notice.tsx` + Modal)
- Definir constante `CONTRACT_TYPES_WITHOUT_NOTICE = ['estagio', 'Estágio', 'PJ']`
- Quando o tipo de contrato estiver nessa lista, o wizard pula automaticamente do Step 1 para o Step 3
- O stepper reflete as etapas filtradas dinamicamente

#### 3. Folha de Pagamento por Tipo de Contrato (`TerminationStep3Payroll.tsx`)
- Criar mapeamento de cálculos por tipo de contratação:

```text
CLT:
  - Saldo de salário
  - Férias proporcionais + 1/3
  - 13º proporcional
  - Multa FGTS 40% (sem justa causa) ou 20% (acordo)
  - Aviso prévio (se aplicável)

Estágio:
  - Saldo de bolsa-auxílio (proporcional)
  - Recesso remunerado proporcional (30 dias/ano, sem 1/3)

PJ:
  - Apenas valores previstos em contrato (sem cálculos automáticos CLT)
  - Exibir mensagem orientativa
  - Manter apenas ajustes manuais

Sócio:
  - Pró-labore proporcional
  - Sem férias/13º/FGTS
  - Ajustes manuais para participação societária

Menor Aprendiz:
  - Saldo de salário
  - Férias proporcionais + 1/3
  - 13º proporcional
  - FGTS com alíquota de 2% (não 8%)
  - Sem multa FGTS (contrato determinado)
```

- Refatorar `autoCalcs` para usar função que recebe `tipoContratacao` e retorna apenas os itens aplicáveis
- Mensagem contextual no topo explicando as regras do tipo

#### 4. Documentos por Tipo de Contrato (`TerminationStep4Documents.tsx`)
- Substituir `DOCUMENT_CHECKLIST` estático por mapeamento dinâmico:

```text
CLT:
  Obrigatórios: Termo de Rescisão, TRCT, Exame Demissional
  Opcionais: Homologação, Carta de Demissão

Estágio:
  Obrigatórios: Termo de Encerramento de Estágio, Relatório Final
  Opcionais: Avaliação de Desempenho

PJ:
  Obrigatórios: Distrato/Rescisão Contratual
  Opcionais: Termo de Quitação

Sócio:
  Obrigatórios: Alteração Contratual, Ata de Reunião
  Opcionais: Termo de Cessão de Quotas

Menor Aprendiz:
  Obrigatórios: Termo de Rescisão, TRCT, Exame Demissional
  Opcionais: Relatório de Atividades
```

- Exibir badges "Obrigatório" (vermelho) e "Opcional" (cinza) ao lado de cada item
- Prop `contractType` passada do Modal para o Step 4

#### 5. Revisão Adaptada (`TerminationStep5Review.tsx`)
- Refatorar cálculos financeiros para reutilizar a mesma lógica do Step 3
- Esconder seção de Aviso Prévio quando não aplicável ao tipo de contrato

### Arquivos Modificados
- `src/components/employees/TerminationWizardModal.tsx` — stepper dinâmico, skip de steps
- `src/components/employees/termination-wizard/TerminationStep2Notice.tsx` — sem mudanças (será skipado)
- `src/components/employees/termination-wizard/TerminationStep3Payroll.tsx` — lógica por tipo
- `src/components/employees/termination-wizard/TerminationStep4Documents.tsx` — checklist por tipo + prop contractType
- `src/components/employees/termination-wizard/TerminationStep5Review.tsx` — adaptar revisão

