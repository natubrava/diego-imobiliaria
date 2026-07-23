import * as api from './api.js?v=20260723-1';
import { escHtml, renderIcons, setButtonBusy, toast } from './utils.js?v=20260723-1';

export async function renderConfiguracoes(container) {
  let config = { emailAlerta:'', diasAntecedencia:5, diasRenovacao:60, alertasAtivos:'true' };
  let online = false;
  try { await api.ping(); const response = await api.getConfig(); config = { ...config, ...(response.data||{}) }; online = true; } catch {}
  container.innerHTML = `
    <header class="section-heading"><div><h2>Configurações do sistema</h2><p>Conexão, alertas automáticos e manutenção da base.</p></div></header>
    <div class="settings-grid">
      <div class="stack">
        <section class="settings-card"><h2>Alertas automáticos</h2><p>O sistema envia um único resumo diário com aluguéis a vencer, atrasados e contratos próximos da renovação.</p>
          <div class="form-grid"><div class="field"><label>E-mail que recebe o resumo</label><input id="cfgEmail" type="email" value="${escHtml(config.emailAlerta)}" placeholder="diego@email.com"></div><div class="field"><label>Avisar aluguel com quantos dias?</label><input id="cfgDueDays" type="number" min="1" max="30" value="${Number(config.diasAntecedencia)||5}"></div><div class="field"><label>Avisar renovação com quantos dias?</label><input id="cfgRenewDays" type="number" min="7" max="180" value="${Number(config.diasRenovacao)||60}"></div><label style="display:flex;align-items:center;gap:8px;font-size:12px"><input id="cfgAlerts" type="checkbox" ${String(config.alertasAtivos)!=='false'?'checked':''}> Alertas diários ativos</label></div>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="primary-button" id="saveConfig"><i data-lucide="save"></i>Salvar alertas</button><button class="ghost-button" id="testAlerts"><i data-lucide="send"></i>Verificar agora</button></div>
        </section>
        <section class="settings-card"><h2>Conexão com a base</h2><p>A URL identifica a implantação do Apps Script. O código de acesso evita que desconhecidos consultem ou alterem a planilha.</p>
          <div class="connection-panel"><i style="background:${online?'var(--success)':'var(--danger)'}"></i><div><strong>${online?'Conexão funcionando':'Não foi possível conectar'}</strong><span>${online?'Dados sincronizados com o Google Sheets.':'Revise a URL, o código e a implantação.'}</span></div></div>
          <div class="form-grid"><div class="field"><label>URL do Web App</label><input id="cfgUrl" type="url" value="${escHtml(api.getApiUrl())}"></div><div class="field"><label>Código de acesso</label><input id="cfgToken" type="password" value="${escHtml(api.getAccessToken())}" placeholder="Definido nas propriedades do script"><small class="field-hint">O mesmo código funciona em todos os computadores.</small></div></div>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="primary-button" id="saveConnection"><i data-lucide="plug-zap"></i>Salvar e testar</button><button class="ghost-button" id="copyAccessLink"><i data-lucide="link"></i>Copiar link de acesso</button><button class="ghost-button" id="setupSystem"><i data-lucide="wand-sparkles"></i>Preparar planilha</button></div>
          <div class="callout warning" style="margin-top:14px"><i data-lucide="shield-alert"></i><div>O link privado entra automaticamente em qualquer computador. Envie apenas ao Diego: quem tiver esse link poderá acessar o sistema.</div></div>
        </section>
      </div>
      <div class="stack">
        <section class="settings-card"><h2>Instalação em 4 passos</h2><p>Depois da primeira configuração, o Diego não precisa voltar aqui.</p><div class="step-list">
          ${step(1,'Cole o backend','Substitua o conteúdo do projeto Apps Script pelo arquivo apps-script/Code.gs.')}
          ${step(2,'Defina o código de acesso','Em Configurações do projeto → Propriedades do script, crie APP_TOKEN com um código forte.')}
          ${step(3,'Implante o Web App','Execute como você e permita acesso a qualquer pessoa; o APP_TOKEN protege as ações.')}
          ${step(4,'Prepare a planilha','Cole URL e código nesta tela, salve e clique em “Preparar planilha”.')}
        </div></section>
        <section class="settings-card"><h2>Segurança importante</h2><p>Nunca deixe tokens de GitHub ou chaves de e-mail dentro dos arquivos do projeto. A versão 2 usa variáveis de ambiente e Propriedades do Script.</p><div class="callout warning"><i data-lucide="shield-alert"></i><div>As chaves que existiam na versão antiga devem ser revogadas e recriadas, mesmo depois de removidas dos arquivos.</div></div></section>
      </div>
    </div>`;
  bind(container); renderIcons(container);
}

const step = (number,title,text) => `<div class="step"><b>${number}</b><div><strong>${title}</strong><span>${text}</span></div></div>`;

function bind(container) {
  container.querySelector('#saveConnection').onclick = async event => {
    const button=event.currentTarget; api.setApiUrl(container.querySelector('#cfgUrl').value); api.setAccessToken(container.querySelector('#cfgToken').value); setButtonBusy(button,true,'Testando…');
    try { api.clearCache(); await api.ping(); toast('Conexão salva e funcionando.','success'); window.dispatchEvent(new CustomEvent('app:connection',{detail:true})); window.dispatchEvent(new CustomEvent('app:refresh')); }
    catch(error){ toast(error.message,'error'); window.dispatchEvent(new CustomEvent('app:connection',{detail:false})); setButtonBusy(button,false); }
  };
  container.querySelector('#copyAccessLink').onclick = async () => {
    const link = api.getPrivateAccessLink();
    if (!link) return toast('Salve primeiro o código de acesso.','error');
    try {
      await navigator.clipboard.writeText(link);
      toast('Link privado copiado. Envie somente ao Diego.','success');
    } catch {
      toast('O navegador bloqueou a cópia. Abra o arquivo privado salvo na pasta do projeto.','error');
    }
  };
  container.querySelector('#saveConfig').onclick = async event => { const button=event.currentTarget; setButtonBusy(button,true); try { await api.saveConfig({ emailAlerta:container.querySelector('#cfgEmail').value.trim(), diasAntecedencia:Number(container.querySelector('#cfgDueDays').value), diasRenovacao:Number(container.querySelector('#cfgRenewDays').value), alertasAtivos:container.querySelector('#cfgAlerts').checked }); toast('Alertas atualizados.','success'); setButtonBusy(button,false); } catch(error){ toast(error.message,'error'); setButtonBusy(button,false); } };
  container.querySelector('#testAlerts').onclick = async event => { const button=event.currentTarget; setButtonBusy(button,true,'Verificando…'); try { const result=await api.runAlertCheck(); toast(result.sent?'Resumo enviado para o e-mail configurado.':'Nenhum alerta precisava ser enviado hoje.','success'); } catch(error){ toast(error.message,'error'); } setButtonBusy(button,false); };
  container.querySelector('#setupSystem').onclick = async event => { const button=event.currentTarget; setButtonBusy(button,true,'Preparando…'); try { await api.setupSystem(); toast('Planilha, colunas e automação preparados.','success'); } catch(error){ toast(error.message,'error'); } setButtonBusy(button,false); };
}
