

## Plano: Desbloquear timesheets travados pelo bug anterior

### Diagnóstico

O bug anterior (submissão de um membro travava todos do projeto) afetou as seguintes semanas e funcionários:

**Semana 02-06/Mar (3 funcionários travados):**
- Guilherme Valadares Pereira — 20h (Marketing-Leg Growth)
- Italo Cesar Castro — 9h distribuídos, mas vários projetos com 0h travados (Prumo, Hayann, Bry)
- Maria Cecília Prado Coelho — 40h (Prumo + Gestão de Portfólio, vários dias com 0h travados)

**Semana 23-27/Fev (8 funcionários travados):**
- Enzo Rodrigues Pieroni (30h), Gabriel Arantes Silva (20h), Kauany Sebastiana Arantes (30h), Luis Miguel de Sousa Silva (40h), Maria Cecília (40h), Mariana Almeida Mendonça (30h), Rafael Bruno Andrade (40h), Victor Couto (25h)

### Solução

Executar uma migration para desbloquear **todos** os registros `is_locked = true` das semanas afetadas (de 23/Fev em diante), permitindo que todos os funcionários revisem e reenviem suas horas com o mecanismo individual corrigido.

```sql
UPDATE project_timesheets
SET is_locked = false
WHERE is_locked = true
  AND work_date >= '2026-02-23';
```

Isso afeta ~47 registros nas 2 semanas. As semanas anteriores a 23/Fev permanecerão travadas como estão (já foram consolidadas).

Os funcionários poderão então lançar/corrigir suas horas e submeter individualmente sem afetar os colegas.

### Arquivos alterados
- Nenhum arquivo de código — apenas uma migration SQL de dados

