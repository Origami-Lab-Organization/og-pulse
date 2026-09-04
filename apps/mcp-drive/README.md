# og-pulse MCP Drive

Sobe arquivos na pasta do projeto no OneDrive direto do chat.

> "Sobe o `/Users/italo/Downloads/ata-kickoff.docx` na pasta Execução do projeto
> Cobrança Automática"

## Como o acesso funciona

**Delegado, por pessoa.** Cada um autoriza a própria conta Microsoft neste
computador (device code) e toda chamada ao Graph vale como ela — com exatamente
a permissão que ela já tem no OneDrive. O servidor não decide acesso a arquivo.

Foi escolha explícita não usar application permission: um segredo central daria
a este processo, dirigido por um LLM, escrita em qualquer arquivo da empresa.
Ver ADR-0019.

**O acesso ao Pulse também é seu.** O MCP entra com as suas credenciais usando a
chave publicável (a mesma que já vai no bundle do site) — **não usa
`service_role`**. A RLS vale normalmente: ele só enxerga os projetos que você
enxerga.

Aqui há um LLM no volante; dar a ele um cliente que ignora RLS seria outro
patamar de risco. E resolve o problema prático de quem usa Lovable Cloud e não
tem o painel bruto do Supabase para pegar a service key.

`apps/mcp-activities` usava `service_role` e bypassava a RLS, o que era a mesma
falha com outro nome — corrigido em 02/09 (TD-0015). Hoje os **dois** servidores
operam sob a RLS, com a chave publicável e login da própria pessoa.

Dois caches locais, ambos `0600` e fora do repositório:
`~/.og-pulse/msal-drive-cache.json` (refresh token da Microsoft) e
`~/.og-pulse/pulse-session.json` (sessão do Pulse).

## Instalação

**Para o time (GP, PM, dev):** um comando só, a partir da raiz do repositório.

```bash
bash apps/mcp-drive/install.sh
```

O script confere o Node, compila, pergunta e-mail e senha do Pulse (digitados,
nunca por argumento — senha em linha de comando fica no histórico do shell) e
registra o servidor no Claude Code e no Claude Desktop, mesclando o JSON para não
apagar outros MCPs já configurados.

`INSTALACAO.txt` é o passo a passo em linguagem não técnica, pronto para enviar
a quem vai instalar.

### Manual

```bash
cd apps/mcp-drive
npm install
npm run build
```

Em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "og-pulse-drive": {
      "command": "node",
      "args": ["/caminho/para/og-pulse/apps/mcp-drive/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://vkriobpmolgopbbpqeky.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "<a mesma do .env, VITE_SUPABASE_PUBLISHABLE_KEY>",
        "PULSE_EMAIL": "voce@origamilab.com.br",
        "PULSE_PASSWORD": "<sua senha do Pulse>",
        "MICROSOFT_CLIENT_ID": "53d51c7c-a706-4c82-ba99-63192a93202f",
        "MICROSOFT_TENANT_ID": "a3d591d4-0b3e-4a17-9745-b78bcf007f74"
      }
    }
  }
}
```

A senha fica no arquivo de configuração do cliente MCP, lida do ambiente — ela
**nunca passa pelo contexto do modelo**. Depois do primeiro login, a sessão é
renovada pelo refresh token em cache.

> Quem entra no Pulse só por SSO da Microsoft pode não ter senha definida. O
> caminho para eliminar a senha daqui é usar o ID token do device code na Edge
> Function `microsoft-sso` — mas o ADR-0016 registra que aquele fluxo **ainda não
> foi verificado** contra o Entra ID real. Quando for, esta configuração perde
> `PULSE_EMAIL`/`PULSE_PASSWORD`.

Na primeira vez, peça `microsoft_login`: o servidor devolve a URL e o código.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `microsoft_status` | Mostra qual conta está autorizada |
| `microsoft_login` | Inicia o device code e devolve URL + código |
| `find_project` | Busca projeto por nome, só os que têm pasta vinculada |
| `list_project_folder` | Lista pastas e arquivos, com caminho tipo `3.Execução/Sprints` |
| `create_project_folder` | Cria pasta (falha se o nome já existir, em vez de renomear em silêncio) |
| `upload_to_project` | Sobe arquivo de caminho local ou URL https |

O caminho da pasta é comparado sem diferenciar maiúscula nem acento — quem fala
no chat não digita `3.Execução` com precisão.

## Limites e proteções

- **100MB por arquivo.** Acima de 4MB o upload usa sessão do Graph.
- **URL só https**, sem seguir redirecionamento, e endereços de rede interna
  (loopback, 10.x, 192.168.x, 172.16–31.x, link-local) são recusados: sem isso,
  uma URL sugerida pelo modelo viraria porta para a rede local da pessoa.
- O projeto precisa ter pasta vinculada no Pulse (aba Arquivos). Sem vínculo, a
  ferramenta explica o que fazer em vez de falhar seco.

## Verificação pendente

Nada foi exercitado contra o Graph real nem contra um cliente MCP. Antes de
liberar para o time, vale testar: device code numa máquina limpa, upload acima
de 4MB (caminho de sessão), pasta inexistente no caminho, projeto sem vínculo, e
URL apontando para rede interna.
