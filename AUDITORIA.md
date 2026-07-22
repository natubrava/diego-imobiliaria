# Auditoria e evolução — Diego Imóveis

## Diagnóstico da versão recebida

### Riscos críticos

- Token do GitHub e chave de envio de e-mail estavam gravados em texto puro nos arquivos. Remover do código não invalida cópias anteriores; as duas credenciais precisam ser revogadas.
- O Web App aceitava leitura, gravação e exclusão sem autenticação. Qualquer pessoa com a URL podia alterar a planilha.
- Operações de escrita não usavam `LockService`, criando risco de colisão e perda de dados em ações simultâneas.
- Exclusão de um imóvel apagava também seu histórico financeiro, sem trilha de auditoria.

### Problemas de produto

- O pedido original incluía vencimento e renovação anual, mas o sistema só alertava o aluguel mensal.
- A documentação descrevia clientes e contratos; a implementação real já havia removido esses módulos.
- “Imóvel” misturava unidade física e contrato. A versão 2 mantém a planilha existente por compatibilidade, mas apresenta o conceito correto de locação na interface.
- O controle mostrava só pagamentos já criados. Meses pendentes não existiam como visão anual.
- Cada alerta gerava um e-mail separado e podia aumentar o ruído em vez de ajudar.
- Cadastro unitário exigia retrabalho para quem já organiza dados no Google Sheets.
- O layout anterior tinha boa base visual, mas era denso, escuro e pouco orientado à rotina no celular.

## Decisões da versão 2

- **Uma fila, não vários painéis:** vencimentos, atrasos e renovações aparecem juntos e em ordem de urgência.
- **Grade calculada:** os 12 meses são gerados automaticamente para cada locação; não é preciso criar parcelas.
- **Confirmação rápida:** tocar no mês registra o valor e a data de hoje, com possibilidade de corrigir ou desfazer.
- **Cadastro progressivo:** só nome, valor e vencimento são indispensáveis. Renovação é fortemente recomendada; contatos e endereço podem ser completados depois.
- **Importação por colagem:** copiar quatro colunas da planilha atual evita digitação e atualiza registros pelo nome sem duplicar.
- **Resumo consolidado:** um e-mail reúne o que importa; eventos são deduplicados por estágio.
- **Histórico preservado:** locações são encerradas, não apagadas pela interface. A aba de auditoria registra mudanças.
- **Vendas como extensão leve:** carteira com preço, estágio, foto/link e canais; não tenta substituir um CRM completo antes de validar a rotina.

## Leitura dos arquivos enviados em 22/07/2026

- `LOCACAO ANUAL 2026.jpeg` contém 28 linhas: 23 completas e 5 que ainda precisam de dia de vencimento; duas dessas cinco também não têm valor.
- A lista nova corrige diversos valores em relação ao importador antigo e acrescenta `SOLEADO 106`.
- Os prints de vendas mostram o Perfil da Empresa do Google usando a área de Produtos como vitrine. Por isso a carteira registra o canal Google e o link do anúncio, mas mantém Instagram, portais e WhatsApp no mesmo checklist.

## Limites conscientes e próximos passos

1. Validar a versão 2 por algumas semanas antes de adicionar um CRM maior.
2. Se o Diego quiser publicação automática no Perfil da Empresa do Google, confirmar primeiro a disponibilidade e as restrições atuais da API de Business Profile; não assumir automação de “Produtos”.
3. Para múltiplos corretores, dados de locatários ou documentos, migrar a autenticação e o banco para uma solução com usuários e regras por linha.
4. Depois de validar vendas, acrescentar leads, follow-ups e geração de kit de divulgação a partir de fotos e descrição.
5. Para WhatsApp automático, usar apenas API oficial e modelos aprovados; evitar automações frágeis pelo WhatsApp Web.
