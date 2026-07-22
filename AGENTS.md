# Instruções para agentes e IAs

Antes de alterar este projeto, leia nesta ordem:

1. `CONTEXTO-IA.md` — mapa dos serviços, contas, IDs, segredos e estado atual.
2. `SETUP.md` — instalação, implantação e validação.
3. `AUDITORIA.md` — decisões técnicas, riscos e evolução do produto.
4. `CREDENCIAIS-LOCAL.md` — inventário privado disponível somente nesta pasta local.

## Regras obrigatórias

- A fonte oficial das locações é a aba `Imoveis` da planilha `BASE_IMOBILIARIA`, atualizada pelo arquivo `LOCACAO ANUAL 2026.jpeg`.
- Não recupere registros da base antiga para a base ativa. As abas `Backup_*` existem apenas para contingência.
- Nunca mostre valores de tokens, chaves ou credenciais em respostas, logs, commits ou chamadas de ferramenta.
- Nunca publique `API Diego chaves.txt`, `CREDENCIAIS-LOCAL.md`, imagens recebidas ou a pasta `data/`.
- O `APP_TOKEN` fica nas Propriedades do script do Google Apps Script. Não duplique seu valor no código.
- Antes de qualquer publicação, confirme o repositório e a conta de destino. O repositório original atualmente concede apenas leitura às contas locais conhecidas.
- Preserve alterações do usuário e faça backup antes de migrações destrutivas.
- Depois de mudanças no código, execute `npm test`.
- Depois de mudanças na planilha, releia os intervalos afetados e faça verificação visual no Google Sheets.

## Situação resumida

- Planilha real migrada e limpa com a lista de 2026.
- Código novo já foi colocado no projeto Apps Script.
- `APP_TOKEN` já foi criado nas Propriedades do script.
- A autorização final e a nova versão do Web App ainda precisam ser concluídas.
- O frontend ainda não foi publicado pela conta atual. Consulte `CONTEXTO-IA.md` para os bloqueios exatos.

