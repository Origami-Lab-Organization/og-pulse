

# Ajustes na Tela do Funcionario

## Alteracoes

### 1. Seletor de semanas alinhado a direita

Mover o `TimesheetWeekSelector` para o lado direito do header, mantendo o botao de voltar a esquerda. Ajustar o layout flex com `justify-between`.

### 2. Abrir na primeira semana nao enviada

Ao abrir a pagina, ao inves de iniciar sempre na primeira segunda-feira do mes (ou semana atual), buscar as submissoes do mes e identificar a primeira semana que ainda nao foi enviada para esse funcionario. Se todas as semanas estiverem enviadas, abrir na semana atual.

## Arquivo a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EmployeeTimesheetPage.tsx` | (1) Reposicionar week selector a direita. (2) Adicionar logica para identificar primeira semana pendente e usala como `selectedDate` inicial |

## Detalhes tecnicos

### Layout do header (linhas 217-227)

Separar o botao de voltar (esquerda) do seletor de semanas (direita):

```text
<div className="flex items-center justify-between gap-4">
  <Button variant="outline" size="icon" onClick={...}>
    <ArrowLeft />
  </Button>
  <TimesheetWeekSelector ... />
</div>
```

### Logica da semana inicial

- Buscar `project_timesheet_submissions` do mes para os projetos do funcionario
- Gerar todas as semanas do mes (cada segunda-feira)
- Encontrar a primeira semana onde nem todos os projetos possuem `status = 'submitted'`
- Se encontrar, usar essa semana como `selectedDate` inicial
- Caso contrario, usar a semana atual

Como os dados de projetos e submissoes dependem de queries async, o `selectedDate` sera atualizado via `useEffect` apos os dados carregarem, apenas na primeira renderizacao (com um flag `hasInitialized`).

