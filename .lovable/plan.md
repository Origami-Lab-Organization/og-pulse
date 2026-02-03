
# Plano: Reordenar Campos do Formulario de Stakeholder

## Situacao Atual

A ordem dos campos no formulario e:
1. Nome, Papel
2. Organizacao, Nivel de Patrocinio
3. E-mail, Telefone
4. Nivel de Influencia, Nivel de Interesse
5. Observacoes

## Nova Ordem Solicitada

O usuario deseja que E-mail e Telefone venham logo apos Nome e Papel:
1. Nome, Papel
2. E-mail, Telefone
3. Organizacao, Nivel de Patrocinio
4. Nivel de Influencia, Nivel de Interesse
5. Observacoes

## Alteracao Necessaria

### Arquivo: `src/components/projects/stakeholders/StakeholderFormDialog.tsx`

Reordenar os blocos `<div className="grid grid-cols-2 gap-4">` para refletir a nova ordem:

**Antes (linhas 163-288):**
```
Bloco 1: Nome, Papel (linhas 163-202)
Bloco 2: Organizacao, Nivel de Patrocinio (linhas 204-254)
Bloco 3: E-mail, Telefone (linhas 256-288)
Bloco 4: Nivel de Influencia, Nivel de Interesse (linhas 290-336)
```

**Depois:**
```
Bloco 1: Nome, Papel
Bloco 2: E-mail, Telefone (movido para cima)
Bloco 3: Organizacao, Nivel de Patrocinio (movido para baixo)
Bloco 4: Nivel de Influencia, Nivel de Interesse
```

## Resultado Visual

```text
┌─────────────────────────────────────────────────────┐
│  Novo Stakeholder                                   │
├─────────────────────────────────────────────────────┤
│  Nome *              │  Papel *                     │
│  [Nome completo    ] │  [Selecione          v]     │
├─────────────────────────────────────────────────────┤
│  E-mail              │  Telefone                    │
│  [email@exemplo.com] │  [(00) 00000-0000   ]       │
├─────────────────────────────────────────────────────┤
│  Organizacao         │  Nivel de Patrocinio         │
│  [Selecione      v]  │  [Selecione          v]     │
├─────────────────────────────────────────────────────┤
│  Nivel de Influencia │  Nivel de Interesse          │
│  [Selecione      v]  │  [Selecione          v]     │
├─────────────────────────────────────────────────────┤
│  Observacoes                                        │
│  [Observacoes sobre o stakeholder...             ] │
├─────────────────────────────────────────────────────┤
│                      [Cancelar]  [Adicionar]        │
└─────────────────────────────────────────────────────┘
```

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/stakeholders/StakeholderFormDialog.tsx` | Mover bloco E-mail/Telefone para logo apos Nome/Papel |
