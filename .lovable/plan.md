

# Plano: Inserir Tabela de Preços para Origami Lab

## Objetivo

Inserir 24 registros de papéis e valores hora na tabela `role_rates` para o tenant Origami Lab (tenant_id: `93e40db0-4946-48ba-b40f-7ee9d02734e0`).

---

## Dados a Inserir

| Papel | Senioridade | Valor Hora |
|-------|-------------|------------|
| Gerente de Produto | Júnior | R$ 30,00 |
| Gerente de Produto | Pleno | R$ 50,00 |
| Gerente de Produto | Sênior | R$ 90,00 |
| Gerente de Produto | Especialista | R$ 110,00 |
| Engenheiro de Software | Júnior | R$ 25,00 |
| Engenheiro de Software | Pleno | R$ 50,00 |
| Engenheiro de Software | Sênior | R$ 90,00 |
| Engenheiro de Software | Especialista | R$ 110,00 |
| Designer de Produto | Júnior | R$ 20,00 |
| Designer de Produto | Pleno | R$ 35,00 |
| Designer de Produto | Sênior | R$ 70,00 |
| Designer de Produto | Especialista | R$ 100,00 |
| Analista de Dados | Júnior | R$ 20,00 |
| Analista de Dados | Pleno | R$ 40,00 |
| Analista de Dados | Sênior | R$ 70,00 |
| Analista de Dados | Especialista | R$ 100,00 |
| Gerente de Projetos | Júnior | R$ 30,00 |
| Gerente de Projetos | Pleno | R$ 50,00 |
| Gerente de Projetos | Sênior | R$ 90,00 |
| Gerente de Projetos | Especialista | R$ 110,00 |
| Consultor de Inovação | Júnior | R$ 45,00 |
| Consultor de Inovação | Pleno | R$ 75,00 |
| Consultor de Inovação | Sênior | R$ 135,00 |
| Consultor de Inovação | Especialista | R$ 165,00 |

---

## Detalhes Técnicos

### Migração SQL

Será executada uma migração para inserir os 24 registros diretamente no banco de dados, associados ao tenant correto.

```sql
INSERT INTO public.role_rates (tenant_id, role_name, seniority, hourly_rate, status)
VALUES 
  -- Gerente de Produto
  ('93e40db0-4946-48ba-b40f-7ee9d02734e0', 'Gerente de Produto', 'junior', 30.00, 'active'),
  ('93e40db0-4946-48ba-b40f-7ee9d02734e0', 'Gerente de Produto', 'pleno', 50.00, 'active'),
  ('93e40db0-4946-48ba-b40f-7ee9d02734e0', 'Gerente de Produto', 'senior', 90.00, 'active'),
  ('93e40db0-4946-48ba-b40f-7ee9d02734e0', 'Gerente de Produto', 'especialista', 110.00, 'active'),
  -- ... (mais 20 registros)
  ('93e40db0-4946-48ba-b40f-7ee9d02734e0', 'Consultor de Inovação', 'especialista', 165.00, 'active');
```

---

## Resultado Esperado

Após a aprovação, os 24 papéis estarão disponíveis na Tabela de Preços do tenant Origami Lab, todos com status "Ativo".

