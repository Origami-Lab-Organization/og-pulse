# Pattern: Logging

## Regras

- Logs devem ajudar diagnostico sem expor PII, valores sensiveis, tokens ou payloads completos.
- Use logs estruturados em Edge Functions quando possivel: evento, tenant/contexto tecnico anonimo, status e erro sanitizado.
- No frontend, preferir feedback para usuario via toast/estado visual e logs discretos apenas para falhas inesperadas.

## Nunca logar

- Chaves, tokens, cookies, URLs assinadas ou credenciais.
- Dados pessoais completos de colaboradores/candidatos/clientes.
- Valores financeiros detalhados quando nao forem indispensaveis ao diagnostico.
- Respostas completas de APIs externas com dados sensiveis.
