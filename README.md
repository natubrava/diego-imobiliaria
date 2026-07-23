# Diego Imóveis

Central simples e responsiva para administrar locações, pagamentos anuais e imóveis à venda. O frontend é estático e o backend usa Google Apps Script com Google Sheets.

**Sistema online:** <https://natubrava.github.io/diego-imobiliaria/>

**Código-fonte:** <https://github.com/natubrava/diego-imobiliaria>

> **Continuidade:** agentes e IAs devem começar por [AGENTS.md](AGENTS.md) e [CONTEXTO-IA.md](CONTEXTO-IA.md). Esses arquivos registram recursos, contas, localização segura das credenciais e o estado real da implantação sem expor valores secretos.

## O que a versão 2 resolve

- fila diária única com atrasos, próximos vencimentos e renovações;
- grade anual de pagamentos inspirada na planilha real do Diego;
- confirmação de pagamento em um toque;
- importação em lote por copiar e colar do Google Sheets;
- cadastro mínimo, com campos complementares opcionais;
- carteira de vendas e checklist de divulgação por canal;
- resumo diário consolidado por e-mail, sem mensagens repetidas;
- migração automática de colunas sem apagar os dados antigos;
- código de acesso no backend, auditoria de mudanças e escrita com bloqueio;
- link privado reutilizável para ativar rapidamente computadores autorizados;
- interface mobile-first e sem dependência de framework.

Consulte [SETUP.md](SETUP.md) para instalar, [AUDITORIA.md](AUDITORIA.md) para as decisões técnicas e [CONTEXTO-IA.md](CONTEXTO-IA.md) para operação e continuidade.
