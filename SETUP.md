# Diego Imóveis — instalação da versão 2

> Para IDs, contas, URLs, localização das credenciais e estado atual da publicação, consulte `CONTEXTO-IA.md`. Valores secretos ficam somente nas Propriedades do Apps Script, no chaveiro da ferramenta correspondente ou em variáveis temporárias de ambiente.

## Antes de publicar

1. Revogue o token do GitHub e a chave do Resend usados pela versão antiga. Eles estavam gravados em arquivos do projeto e devem ser considerados comprometidos.
2. Gere um código longo e aleatório para o sistema (recomendação: 32 caracteres ou mais).
3. Não coloque esse código, tokens ou chaves dentro de arquivos do projeto.

## Backend no Google Apps Script

1. Abra a planilha `BASE_IMOBILIARIA` e acesse **Extensões → Apps Script**.
2. Substitua o código pelo conteúdo de `apps-script/Code.gs`.
3. Em **Configurações do projeto → Propriedades do script**, crie:
   - `APP_TOKEN`: código longo usado para acessar o sistema.
4. Salve e execute manualmente `setupSystemFromMenu` uma vez. Autorize Planilhas, e-mail e acionadores.
5. Em **Implantar → Nova implantação → Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie a URL final terminada em `/exec`.

O acesso externo precisa ficar habilitado porque o frontend está no GitHub Pages. O `APP_TOKEN` passa a ser exigido em todas as requisições. Para dados pessoais mais sensíveis ou vários usuários, a evolução indicada é autenticação Google/Firebase ou Supabase com regras por usuário.

## Frontend

1. Publique os arquivos no GitHub Pages.
2. Abra **Configurações** no sistema.
3. Cole a URL `/exec` e o mesmo `APP_TOKEN`.
4. Clique em **Salvar e testar** e depois em **Preparar planilha**.
5. Preencha o e-mail de alertas e salve.

## Importar a lista recebida em 2026

A transcrição do arquivo `LOCACAO ANUAL 2026.jpeg` está em `data/locacoes-2026.csv`. Há duas opções:

- No sistema, abra **Locações → Colar planilha** e cole as quatro colunas.
- Pelo PowerShell, defina `DIEGO_API_URL` e `DIEGO_APP_TOKEN`, então execute `./import_imoveis.ps1`.

As linhas sem dia de vencimento ficam de fora da importação até serem completadas: `VILLA TOSCANA 801`, `DON VIRGILIO 404`, `POETA DRUMOND 605`, `MARILUZ 92` e `GARDEN VILLAGE 202`.

## Rotina do Diego

- **Todo dia:** abrir a Visão geral somente se receber um resumo por e-mail.
- **Quando receber:** abrir a Grade anual e tocar no mês para confirmar.
- **Contrato novo:** informar imóvel, valor, dia do vencimento e renovação; os demais campos são opcionais.
- **Imóvel à venda:** cadastrar uma vez e marcar os canais de divulgação.

## Publicação sem guardar token no arquivo

O script `deploy.ps1` usa a variável de ambiente `DIEGO_GITHUB_TOKEN`. Exemplo para a sessão atual do PowerShell:

```powershell
$env:DIEGO_GITHUB_TOKEN = "seu-token-novo"
./deploy.ps1
```

## Validação após publicar

- A tela de Configurações mostra “Conexão funcionando”.
- A planilha tem as abas `Imoveis`, `Pagamentos`, `Vendas`, `AlertasLog`, `Auditoria` e `Config`.
- Existe um acionador diário para `checkVencimentos`.
- Um pagamento marcado na Grade anual aparece na Visão geral.
- `Verificar agora` envia apenas um resumo quando houver itens elegíveis.
