

# Remover botao de voltar e reposicionar seletor de semanas

## Resumo

Remover o botao de seta (ArrowLeft) da pagina do funcionario, ja que os breadcrumbs do AppLayout ("Alocacao > Nome do Funcionario") ja fornecem navegacao de volta. Mover o seletor de semanas de volta para a esquerda.

## Alteracoes

### `src/pages/EmployeeTimesheetPage.tsx`

- Remover o botao `<Button variant="outline" size="icon">` com `<ArrowLeft>`
- Remover a import de `ArrowLeft` do lucide-react
- Simplificar o header para mostrar apenas o `TimesheetWeekSelector` alinhado a esquerda
- Os breadcrumbs ja configurados no `AppLayout` (`Alocacao > Nome`) continuam como mecanismo de navegacao de volta

### Layout resultante

```text
Breadcrumb: Alocacao > Enzo Rodrigues Pieroni
Titulo: Enzo Rodrigues Pieroni
Subtitulo: Engenheiro de Software - Jornada: 132h/mes

[ < ]  16/02 - 20/02/2026  [ > ]  Hoje

(conteudo da semana)
```

