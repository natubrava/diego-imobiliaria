# Contexto operacional para futuras IAs

Atualizado em **22/07/2026**. Este arquivo contém referências operacionais, mas **não contém valores secretos**.

## Objetivo do sistema

Sistema do corretor Diego para:

- avisar vencimentos mensais de aluguel;
- avisar renovações anuais;
- registrar pagamentos em uma grade anual;
- manter uma carteira simples de imóveis à venda;
- organizar os canais em que cada imóvel foi divulgado;
- enviar um resumo diário consolidado por e-mail.

## Arquitetura

| Camada | Tecnologia | Localização |
|---|---|---|
| Frontend | HTML, CSS e JavaScript estático | raiz, `css/` e `js/` |
| Backend | Google Apps Script | projeto vinculado à planilha |
| Banco de dados | Google Sheets | planilha `BASE_IMOBILIARIA` |
| Hospedagem planejada | GitHub Pages | publicação ainda pendente |
| Alertas | `MailApp` do Google Apps Script | função `checkVencimentos` |

## Recursos Google

### Planilha

- Nome: `BASE_IMOBILIARIA`
- ID: `1iz1aKvwH7MnEZOZUUwcKOu9TqEb11FdFCLxByHdlRC8`
- URL: <https://docs.google.com/spreadsheets/d/1iz1aKvwH7MnEZOZUUwcKOu9TqEb11FdFCLxByHdlRC8/edit>
- Fuso: `America/Sao_Paulo`
- Localidade: `pt_BR`

Abas utilizadas pela versão 2:

- `Imoveis`: fonte ativa das locações;
- `Pagamentos`: confirmações mensais;
- `Vendas`: carteira e checklist de divulgação;
- `Config`: destinatário e antecedência dos alertas;
- `AlertasLog`: deduplicação de mensagens;
- `Auditoria`: registro das alterações do sistema.

Abas legadas:

- `Clientes` e `Contratos`: mantidas por compatibilidade, mas sem dados ativos após a limpeza de 22/07/2026;
- `Página1` e `Página2`: vazias e não utilizadas;
- `Backup_Imoveis_2026-07-22`, `Backup_Pagamentos_2026-07-22` e `Backup_AlertasLog_2026-07-22`: somente contingência. Não usar como fonte atual.

### Fonte oficial dos dados

- Arquivo recebido: `LOCACAO ANUAL 2026.jpeg`.
- Transcrição local: `data/locacoes-2026.csv`.
- A lista de 2026 substitui a base antiga.
- `SANTOS DUMMOND 85` e `ITAPARICA 103` foram removidos da base ativa porque não aparecem na lista de 2026.
- `MARILUZ 92` e `GARDEN VILLAGE 202` aparecem na lista de 2026, mas permanecem pendentes porque faltam dia, mês e valor.
- `VILLA TOSCANA 801`, `DON VIRGILIO 404` e `POETA DRUMOND 605` permanecem sem dia e mês porque esses campos não foram informados na lista de 2026.
- Não reintroduzir locatário, telefone, datas contratuais ou vencimentos vindos apenas da base antiga.

### Apps Script

- Nome atual do projeto: `Diego Imobiliária — Sistema`
- ID do script: `1YJ_gFySoOaK1oHPFMiuo6SSA9EMC8SNOtZ34TU9cpc89M22zzZ3rBymI`
- Editor: <https://script.google.com/home/projects/1YJ_gFySoOaK1oHPFMiuo6SSA9EMC8SNOtZ34TU9cpc89M22zzZ3rBymI/edit>
- Código-fonte local: `apps-script/Code.gs`
- URL do Web App existente: <https://script.google.com/macros/s/AKfycby4S2kc98PpiKueLvb1lcDzTFiPc2Bwqusgdrtcw51x0ENLZeZzFfSaICTaRPvTvBzt/exec>
- A mesma URL está em `js/api.js` como `DEFAULT_API_URL`.

Estado da implantação em 22/07/2026:

- o código novo foi salvo no projeto;
- o projeto foi renomeado;
- a Propriedade do script `APP_TOKEN` foi criada;
- a implantação existente ainda apontava para a versão 4 antiga;
- a atualização para a nova versão chegou à autorização do Google, mas ficou pendente na tela de aplicativo não verificado;
- não considerar o backend novo publicado até concluir a autorização e confirmar uma nova versão em **Gerenciar implantações**.

Depois da autorização, executar `setupSystemFromMenu` uma vez para garantir abas, configurações e o acionador diário. Verificar em **Acionadores** a existência de `checkVencimentos`.

## Segredos e configurações sensíveis

### `APP_TOKEN` do sistema

- Valor oficial armazenado em: **Apps Script → Configurações do projeto → Propriedades do script → `APP_TOKEN`**.
- O valor foi criado em 22/07/2026 e não deve ser copiado para arquivos versionados.
- No navegador do usuário, o frontend guarda o valor em `localStorage` com a chave `diego_access_token_v2`.
- A URL opcional personalizada fica em `localStorage` com a chave `diego_api_url_v2`.
- Para scripts locais, usar as variáveis `DIEGO_APP_TOKEN` e `DIEGO_API_URL`.
- Se o token for rotacionado, alterar a Propriedade do script e cadastrar o novo valor novamente em cada navegador autorizado.

### GitHub

- Repositório original: <https://github.com/Diegogalafassi/imobiliaria>
- Site antigo: <https://diegogalafassi.github.io/imobiliaria/>
- Contas autenticadas encontradas no GitHub CLI: `Ackerss` e `natubrava`.
- Ambas retornaram permissão `READ` no repositório original.
- O repositório público proposto `natubrava/diego-imobiliaria` **não foi criado**, pois aguarda autorização explícita do usuário.
- O repositório Git local existe, branch `main`, commit inicial `dda4f6fd1f0da7a28f536d9d8aa830f51a21aace`, sem remoto configurado.
- `deploy.ps1` e `update_gs.ps1` leem `DIEGO_GITHUB_TOKEN` do ambiente.
- Pode existir uma credencial antiga no arquivo local `API Diego chaves.txt`; ela é legado, não deve ser impressa nem publicada e deve ser considerada comprometida até ser revogada.

### E-mail e Resend

- Destinatário configurado na aba `Config`: `diegogalafassibc@gmail.com`.
- A versão 2 usa `MailApp` do Google Apps Script e não depende do Resend.
- A chave Resend antiga esteve exposta no código legado. Ela deve ser revogada; não reutilizar nem copiar para a versão 2.

## Contas e responsabilidades conhecidas

| Serviço | Conta/identidade observada | Uso |
|---|---|---|
| Google Sheets / sessão do navegador | `jacsonsax@gmail.com` (Jacson) | sessão conectada que abriu e editou a planilha |
| Apps Script / executar como | `jacsonsax@gmail.com` | identidade mostrada na implantação existente |
| Alertas do sistema | `diegogalafassibc@gmail.com` | destinatário configurado na planilha |
| GitHub original | organização/usuário `Diegogalafassi` | proprietário do repositório original |
| GitHub CLI | `Ackerss`, `natubrava` | contas locais; apenas leitura no repositório original |

Não assuma propriedade apenas pelo e-mail ou pelo nome. Antes de alterar compartilhamento, permissões ou destino de publicação, confirme com o usuário.

## Arquivos privados que nunca devem ser publicados

- `API Diego chaves.txt`
- `CREDENCIAIS-LOCAL.md`
- `.env` e `.env.*`
- `data/`
- `LOCACAO ANUAL 2026.jpeg`
- `diegoenviouprintdealgunsimoveisqvende*.jpeg`

Esses caminhos devem permanecer no `.gitignore`.

## Estado atual e próximos passos

1. Concluir manualmente a autorização do Google na aba já aberta do navegador.
2. Em Apps Script, confirmar a criação da nova versão na implantação existente e preservar a URL `/exec`.
3. Executar `setupSystemFromMenu` e confirmar o acionador diário.
4. Obter autorização explícita para o destino GitHub. Não publicar automaticamente em uma conta diferente.
5. Publicar o frontend sem os arquivos privados.
6. Abrir o site, informar `APP_TOKEN` em **Configurações** e testar conexão, dashboard, locações, grade, vendas e alertas.
7. Não criar pagamentos ou registros fictícios na base real durante o teste.

## Validação técnica local

```powershell
npm test
```

O teste esperado termina com `Smoke test: módulos e utilitários OK`.

