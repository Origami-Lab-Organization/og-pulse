# Padrão: Design System & Conformidade de Jornada

> **Regra inegociável:** todo trabalho de UI ou de jornada DEVE ser validado contra:
> 1. **Design System** — `jornadas/origami-ds.html` (Origami UI v1.1) — referência de **princípios**.

> Antes de criar/alterar tela, componente, rota ou copy: abra os dois docs e confirme princípios, estados, acessibilidade e nomenclatura.

## Fonte de verdade (decisão — NÃO retokenizar)

O app já está implementado no tema **v1.0** (`src/index.css` + tokens shadcn). A decisão do time é **manter como está** e **seguir o padrão a partir de agora** — sem re-tokenizar e sem alterar o que já foi desenvolvido.

- **VALORES** (cor, tipografia, raio, espaço): vêm do **tema implementado** — `src/index.css` e tokens shadcn (`bg-background`, `text-primary`, `text-muted-foreground`, `text-foreground`, `--primary`, `--success`, `--warning`, `--destructive`, `--border`, `--ring`, `--radius`, `bg-gradient-brand`, classes `ol-*`). **Não** introduzir a paleta v1.1 (`#0E895D`, Carbon/Ivory) nem JetBrains Mono em telas novas — isso quebraria a consistência com o app atual.
- **PRINCÍPIOS** (do `origami-ds.html`): usar **tokens** e nunca hex/cores avulsas; estados **hover/focus/active/disabled**; **foco visível**; **WCAG 2.1 AA**; light-first; elevação contida (até 3 níveis); espaçamento base 4px.
- **COMPORTAMENTO e nomenclatura**: das jornadas (`jornadas/*.md`).
- **Código já desenvolvido**: preservado como está — não há refactor retroativo.

> A adoção da paleta v1.1 do `origami-ds.html` (Sea Green `#0E895D`, JetBrains Mono, etc.) seria uma **re-tokenização do projeto inteiro** — está **fora de escopo** e, se um dia for desejada, exige **ADR próprio**. Até lá, o `origami-ds.html` serve como referência de princípios, não de valores.

## Nomenclatura de domínio (jornadas)

- Comercial: usar **Oportunidade / Pipeline / Orçamentos** — **nunca** "Lead", "CRM" ou "Funil" na interface.
- Confirmar termos no `.harness/domain-glossary.md` antes de criar copy.

## Checklist de conformidade (antes de entregar UI)

- [ ] Consultei `origami-ds.html` (princípios) e a jornada relevante (comportamento)?
- [ ] Usei tokens do tema implementado (sem hex/cores avulsas)?
- [ ] Mantive consistência visual com o app atual (não introduzi paleta/fonte v1.1)?
- [ ] Estados hover/focus/active/disabled e foco visível presentes?
- [ ] Contraste WCAG AA?
- [ ] Nomenclatura conforme a jornada e o glossário?