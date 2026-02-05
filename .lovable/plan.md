
# Plano: Simplificar Mensagem do Dialog de Envio

## Objetivo

Simplificar o dialog de confirmação de envio da semana, removendo o resumo de horas e mantendo apenas a pergunta direta de confirmação.

---

## Alteração

### Arquivo: `src/components/timesheets/SubmitWeekDialog.tsx`

**De (atual):**
```
┌─ Enviar Semana ─────────────────────────────────────────┐
│                                                          │
│  Você está prestes a enviar os timesheets da semana     │
│  03/11 - 07/11/2025.                                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Total de horas lançadas                          │   │
│  │ 15.0h                                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ⚠️ Após o envio, os valores serão travados...         │
│                                                          │
│                        [Cancelar] [Confirmar Envio]     │
└──────────────────────────────────────────────────────────┘
```

**Para (simplificado):**
```
┌─ Enviar Semana ─────────────────────────────────────────┐
│                                                          │
│  Deseja enviar os timesheets da semana                  │
│  03/11 - 07/11/2025?                                    │
│                                                          │
│                        [Cancelar] [Confirmar Envio]     │
└──────────────────────────────────────────────────────────┘
```

---

## Mudanças no Código

1. **Remover** o bloco de resumo de horas (`div.rounded-lg bg-muted`)
2. **Remover** o bloco de aviso amarelo
3. **Simplificar** a mensagem para uma pergunta direta: "Deseja enviar os timesheets da semana **03/11 - 07/11/2025**?"
4. **Manter** os botões Cancelar e Confirmar Envio como estão
