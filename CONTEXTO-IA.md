# Contexto operacional para futuras IAs

Atualizado em **23/07/2026**. Este arquivo contém referências operacionais, mas **não contém valores secretos**.

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
| Hospedagem | GitHub Pages | <https://natubrava.github.io/diego-imobiliaria/> |
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
- a autorização do Google foi concluída pelo usuário;
- a implantação existente foi atualizada para a **versão 5**, em 22/07/2026 às 21:19, preservando a mesma URL `/exec`;
- `setupSystemFromMenu` foi executada com sucesso e confirmou “Sistema preparado”;
- o backend protegido foi testado pelo frontend local e confirmou “Conexão funcionando — Dados sincronizados com o Google Sheets”.

Acionadores observados após a preparação:

- havia dois acionadores `checkVencimentos`;
- o acionador recém-criado pela sessão atual foi removido para evitar mensagens duplicadas;
- permaneceu um único acionador pertencente a “Outro usuário”, com última execução observada em 22/07/2026 às 08:21:51 e taxa de erros de 0%;
- não execute novamente `setupSystemFromMenu` sem revisar os acionadores depois, pois cada usuário só consegue listar/remover os próprios acionadores por código.

### Validação integrada

O frontend novo foi aberto localmente em `http://127.0.0.1:4173/` apenas para teste e conectado ao backend público:

- status: `Dados sincronizados`;
- dashboard: 26 locações ativas, R$ 91.548,89 previstos no mês, 22 aluguéis em atraso e 4 renovações em 60 dias;
- locações: 26 registros ativos carregados;
- vendas: 6 anúncios reais carregados;
- grade anual: carregada para 2026, sem criar pagamentos fictícios;
- nenhum dado foi alterado durante o teste.

Esses testes provam que frontend e backend são compatíveis. Em 23/07/2026, o mesmo frontend foi publicado no GitHub Pages.

## Segredos e configurações sensíveis

### `APP_TOKEN` do sistema

- Valor oficial armazenado em: **Apps Script → Configurações do projeto → Propriedades do script → `APP_TOKEN`**.
- O valor foi criado em 22/07/2026 e não deve ser copiado para arquivos versionados.
- No navegador do usuário, o frontend guarda o valor em `localStorage` com a chave `diego_access_token_v2`.
- A URL opcional personalizada fica em `localStorage` com a chave `diego_api_url_v2`.
- Para scripts locais, usar as variáveis `DIEGO_APP_TOKEN` e `DIEGO_API_URL`.
- Se o token for rotacionado, alterar a Propriedade do script e cadastrar o novo valor novamente em cada navegador autorizado.

### GitHub

- Repositório oficial atual: <https://github.com/natubrava/diego-imobiliaria>
- Site oficial atual: <https://natubrava.github.io/diego-imobiliaria/>
- Proprietário: conta GitHub `natubrava`.
- Branch publicada: `main`, pasta raiz, com HTTPS obrigatório.
- Repositório original: <https://github.com/Diegogalafassi/imobiliaria>
- Site antigo: <https://diegogalafassi.github.io/imobiliaria/>
- Contas autenticadas encontradas no GitHub CLI: `Ackerss` e `natubrava`.
- Ambas retornaram permissão `READ` no repositório original.
- O repositório público novo foi criado com autorização explícita do usuário em 23/07/2026.
- O repositório Git local usa a branch `main` e o remoto `origin` aponta para `natubrava/diego-imobiliaria`.
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
| GitHub atual | `natubrava` | proprietário do repositório oficial novo |
| GitHub CLI | `Ackerss`, `natubrava` | contas locais; ambas têm apenas leitura no repositório original |

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

1. O frontend novo está publicado no endereço oficial acima.
2. Em cada navegador autorizado, abrir **Configurações**, informar o `APP_TOKEN` e usar **Salvar e testar**. O token fica somente no `localStorage` daquele navegador.
3. Validar periodicamente o site em desktop e celular.
4. Não criar pagamentos ou registros fictícios na base real durante testes.
5. Futuras publicações devem ser feitas na branch `main` de `natubrava/diego-imobiliaria`; o GitHub Pages recompila automaticamente.

O repositório e o site antigos continuam existindo e podem mostrar a versão anterior, mas não são mais o destino oficial.

## Validação técnica local

```powershell
npm test
```

O teste esperado termina com `Smoke test: módulos e utilitários OK`.
