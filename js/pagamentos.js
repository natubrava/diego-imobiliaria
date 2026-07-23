import * as api from './api.js?v=20260723-1';
import { closeModal, escHtml, formatCurrency, MONTHS, openModal, renderIcons, setButtonBusy, toast } from './utils.js?v=20260723-1';

let selectedYear = new Date().getFullYear();

export async function renderFinanceiro(container) {
  const response = await api.getFinanceiro(selectedYear);
  const rows = response.data || [];
  const totals = response.totais || {};
  container.innerHTML = `
    <header class="section-heading"><div><h2>Controle anual de recebimentos</h2><p>Um clique confirma o mês. É a sua planilha de 2026, só que automática.</p></div><div class="year-nav"><button class="icon-button" id="prevYear"><i data-lucide="chevron-left"></i></button><strong>${selectedYear}</strong><button class="icon-button" id="nextYear"><i data-lucide="chevron-right"></i></button></div></header>
    <section class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      ${summary('wallet-cards', formatCurrency(totals.previsto||0,true), 'Previsto no ano')}
      ${summary('circle-check-big', formatCurrency(totals.recebido||0,true), 'Confirmado no ano', 'success')}
      ${summary('triangle-alert', totals.atrasados||0, 'Meses em atraso', totals.atrasados?'danger':'success')}
    </section>
    <div class="callout" style="margin-bottom:14px"><i data-lucide="mouse-pointer-click"></i><div><strong>Como usar:</strong> clique em um mês pendente para confirmar o recebimento. Clique novamente em um mês pago para corrigir ou desfazer.</div></div>
    <div class="table-card"><div class="table-scroll"><table class="data-table annual-grid"><thead><tr><th>Imóvel</th>${MONTHS.map(month=>`<th>${month}</th>`).join('')}<th>Valor</th></tr></thead><tbody>${rows.length ? rows.map(renderRow).join('') : `<tr><td colspan="14"><div class="empty-state"><div class="empty-icon"><i data-lucide="calendar-x"></i></div><h3>Nenhuma locação ativa</h3><p>Cadastre uma locação para gerar a grade automaticamente.</p></div></td></tr>`}</tbody></table></div></div>`;
  container.querySelector('#prevYear').onclick = () => { selectedYear--; renderFinanceiro(container); };
  container.querySelector('#nextYear').onclick = () => { selectedYear++; renderFinanceiro(container); };
  container.querySelectorAll('[data-payment-cell]').forEach(button => button.onclick = () => openPayment(button.dataset.id, Number(button.dataset.month), button.dataset.status, button.dataset.paymentId, Number(button.dataset.value), Number(button.dataset.day), container));
  renderIcons(container);
}

function summary(icon, value, label, tone='') { return `<article class="kpi-card"><div class="kpi-top"><span class="kpi-icon ${tone}"><i data-lucide="${icon}"></i></span></div><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></article>`; }

function renderRow(item) {
  return `<tr><td><div class="property-cell"><span class="property-avatar">${String(item.nome||'?').slice(0,2)}</span><div><strong>${escHtml(item.nome)}</strong><small>vence dia ${item.diaVencimentoPadrao||'—'}</small></div></div></td>${(item.meses||[]).map((month,index)=>{
    const status = month.status || 'future';
    const icon = status === 'pago' ? 'check' : status === 'overdue' ? 'alert-circle' : status === 'due' ? 'clock-3' : 'minus';
    return `<td><button class="month-cell ${status}" data-payment-cell data-id="${item.id}" data-month="${index+1}" data-status="${status}" data-payment-id="${month.pagamentoId||''}" data-value="${Number(item.valorPadrao)||0}" data-day="${Number(item.diaVencimentoPadrao)||10}" title="${status==='pago'?'Pago — clique para editar':'Clique para confirmar'}"><i data-lucide="${icon}"></i></button></td>`;
  }).join('')}<td><strong>${formatCurrency(item.valorPadrao)}</strong></td></tr>`;
}

function openPayment(imovelId, month, status, paymentId, value, day, container) {
  const paid = status === 'pago';
  const reference = `${selectedYear}-${String(month).padStart(2,'0')}`;
  const maxDay = new Date(selectedYear, month, 0).getDate();
  const dueDate = `${selectedYear}-${String(month).padStart(2,'0')}-${String(Math.min(day,maxDay)).padStart(2,'0')}`;
  const today = new Date().toLocaleDateString('sv-SE');
  openModal({ title: paid ? `Pagamento de ${MONTHS[month-1]}` : `Confirmar ${MONTHS[month-1]}`, kicker:`Referência ${reference}`,
    body:`${paid?'<div class="callout warning" style="margin-bottom:15px"><i data-lucide="info"></i><div>Este mês já está confirmado. Você pode corrigir os dados ou desfazer o lançamento.</div></div>':''}<div class="form-grid"><div class="field"><label>Valor recebido</label><input id="payValue" inputmode="decimal" value="${value}"></div><div class="field"><label>Data do recebimento</label><input id="payDate" type="date" value="${today}"></div><div class="field full"><label>Observação</label><input id="payNote" placeholder="Opcional"></div></div>`,
    footer:`${paid?'<button class="danger-button" id="undoPayment">Desfazer</button>':''}<button class="ghost-button" id="cancelPayment">Cancelar</button><button class="primary-button" id="savePayment"><i data-lucide="check"></i>${paid?'Atualizar':'Confirmar pago'}</button>` });
  document.getElementById('cancelPayment').onclick = () => closeModal();
  document.getElementById('undoPayment')?.addEventListener('click', async event => {
    if (!paymentId) return;
    setButtonBusy(event.currentTarget,true,'Desfazendo…');
    try { await api.deletePagamento(paymentId); closeModal(); toast('Pagamento desfeito.', 'success'); renderFinanceiro(container); } catch(error) { toast(error.message,'error'); setButtonBusy(event.currentTarget,false); }
  });
  document.getElementById('savePayment').onclick = async event => {
    const button = event.currentTarget; setButtonBusy(button,true);
    try { await api.savePagamento({ id:paymentId, imovelId, mesReferencia:reference, dataVencimento:dueDate, dataPagamento:document.getElementById('payDate').value, valor:document.getElementById('payValue').value, status:'pago', observacoes:document.getElementById('payNote').value.trim() }); closeModal(); toast('Recebimento confirmado.', 'success'); renderFinanceiro(container); }
    catch(error) { toast(error.message,'error'); setButtonBusy(button,false); }
  };
}
