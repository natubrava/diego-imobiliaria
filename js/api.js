const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby4S2kc98PpiKueLvb1lcDzTFiPc2Bwqusgdrtcw51x0ENLZeZzFfSaICTaRPvTvBzt/exec';
const URL_KEY = 'diego_api_url_v2';
const TOKEN_KEY = 'diego_access_token_v2';
const CACHE_PREFIX = 'diego_read_cache_v3:';
const CACHE_INDEX_KEY = `${CACHE_PREFIX}index`;
const CACHE_TTL = 300000;
const READ_TIMEOUT = 10000;
const WRITE_TIMEOUT = 22000;
const MAX_READ_ATTEMPTS = 2;
const cache = new Map();
const inFlight = new Map();
const localFallback = new Map();
const sessionFallback = new Map();

function storageFor(name) {
  try { return globalThis[name] || null; } catch { return null; }
}

function storedGet(name, key, fallback) {
  try { return storageFor(name)?.getItem(key) ?? fallback.get(key) ?? null; }
  catch { return fallback.get(key) ?? null; }
}

function storedSet(name, key, value, fallback) {
  fallback.set(key, String(value));
  try { storageFor(name)?.setItem(key, String(value)); } catch {}
}

function storedRemove(name, key, fallback) {
  fallback.delete(key);
  try { storageFor(name)?.removeItem(key); } catch {}
}

export const getApiUrl = () => storedGet('localStorage', URL_KEY, localFallback) || DEFAULT_API_URL;
export const getAccessToken = () => storedGet('localStorage', TOKEN_KEY, localFallback) || '';

export function setApiUrl(url) {
  const value = String(url || '').trim();
  if ((value || DEFAULT_API_URL) !== getApiUrl()) clearCache();
  if (value) storedSet('localStorage', URL_KEY, value, localFallback);
  else storedRemove('localStorage', URL_KEY, localFallback);
}

export function setAccessToken(token) {
  const value = String(token || '').trim();
  if (value !== getAccessToken()) clearCache();
  if (value) storedSet('localStorage', TOKEN_KEY, value, localFallback);
  else storedRemove('localStorage', TOKEN_KEY, localFallback);
}

function sessionIndex() {
  try { return JSON.parse(storedGet('sessionStorage', CACHE_INDEX_KEY, sessionFallback) || '[]'); }
  catch { return []; }
}

function rememberSessionKey(key) {
  const keys = sessionIndex();
  if (!keys.includes(key)) storedSet('sessionStorage', CACHE_INDEX_KEY, JSON.stringify([...keys, key]), sessionFallback);
}

export function clearCache() {
  cache.clear();
  sessionIndex().forEach(key => storedRemove('sessionStorage', key, sessionFallback));
  storedRemove('sessionStorage', CACHE_INDEX_KEY, sessionFallback);
}

function readCache(key, ttl = CACHE_TTL) {
  let entry = cache.get(key);
  if (!entry) {
    try { entry = JSON.parse(storedGet('sessionStorage', `${CACHE_PREFIX}${key}`, sessionFallback) || 'null'); }
    catch { entry = null; }
    if (entry) cache.set(key, entry);
  }
  if (!entry || Date.now() - Number(entry.at || 0) >= ttl) return null;
  return entry.value;
}

function writeCache(key, value) {
  const entry = { at:Date.now(), value };
  cache.set(key, entry);
  const storageKey = `${CACHE_PREFIX}${key}`;
  try {
    storedSet('sessionStorage', storageKey, JSON.stringify(entry), sessionFallback);
    rememberSessionKey(storageKey);
  } catch {}
}

function notifyConnection(online) {
  try {
    if (typeof window?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('app:connection', { detail:online }));
    }
  } catch {}
}

export function readAccessTokenFromHash(hash = '') {
  const value = String(hash).replace(/^#/, '');
  if (!value.startsWith('acesso=')) return '';
  try { return new URLSearchParams(value).get('acesso')?.trim() || ''; }
  catch { return ''; }
}

export function consumePrivateAccessLink() {
  const token = readAccessTokenFromHash(location.hash);
  if (!token) return false;
  setAccessToken(token);
  setApiUrl(DEFAULT_API_URL);
  try { history.replaceState(null, '', `${location.pathname}${location.search}#dashboard`); }
  catch { location.hash = '#dashboard'; }
  return true;
}

export function getPrivateAccessLink() {
  const token = getAccessToken();
  if (!token) return '';
  return `${location.origin}${location.pathname}#acesso=${encodeURIComponent(token)}`;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendRequest(target, body, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(target, {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      redirect:'follow',
      cache:'no-store',
      ...(controller ? { signal:controller.signal } : {})
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function friendlyNetworkError(error) {
  const timedOut = error?.name === 'AbortError';
  const result = new Error(timedOut ? 'A conexão demorou demais. Toque em Atualizar para tentar novamente.' : 'Não foi possível falar com o Google. Confira a internet e tente novamente.');
  result.code = timedOut ? 'TIMEOUT' : 'NETWORK_ERROR';
  return result;
}

async function performRequest(action, { data, params, method, maxAttempts, timeout }) {
  let url = getApiUrl();
  if (!url) throw new Error('Conecte o sistema ao Google Apps Script nas Configurações.');
  const token = getAccessToken();
  const body = new URLSearchParams({ action, token, ...params, data:JSON.stringify(data || {}) });
  const canRetry = method === 'GET';

  const attempts = canRetry ? maxAttempts : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try { response = await sendRequest(url, body, timeout); }
    catch (error) {
      if (canRetry && attempt < attempts - 1) { await delay(300 * (attempt + 1)); continue; }
      throw friendlyNetworkError(error);
    }

    if (response.status === 404 && url !== DEFAULT_API_URL) {
      setApiUrl('');
      url = DEFAULT_API_URL;
      if (attempt < attempts - 1) { await delay(180 * (attempt + 1)); continue; }
    }
    if (!response.ok) {
      if (canRetry && attempt < attempts - 1 && (response.status === 404 || response.status === 429 || response.status >= 500)) { await delay(300 * (attempt + 1)); continue; }
      throw new Error(`Falha de conexão (${response.status}).`);
    }

    let json;
    try { json = await response.json(); }
    catch { throw new Error('O backend respondeu em formato inválido. Confira a implantação.'); }
    if (json.error) {
      if (canRetry && attempt < attempts - 1 && json.code === 'SERVER_ERROR') { await delay(300 * (attempt + 1)); continue; }
      const error = new Error(json.error);
      error.code = json.code;
      throw error;
    }
    notifyConnection(true);
    return json;
  }
  throw new Error('Não foi possível concluir a consulta. Tente novamente.');
}

async function request(action, { data, params = {}, method = 'GET', fresh = false, ttl = CACHE_TTL, maxAttempts = MAX_READ_ATTEMPTS, timeout = method === 'GET' ? READ_TIMEOUT : WRITE_TIMEOUT } = {}) {
  const cacheKey = `${action}:${JSON.stringify(params)}`;
  if (method === 'GET' && !fresh) {
    const cached = readCache(cacheKey, ttl);
    if (cached !== null) return cached;
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
  }

  const operation = performRequest(action, { data, params, method, maxAttempts, timeout })
    .then(value => {
      if (method === 'GET') writeCache(cacheKey, value);
      else clearCache();
      return value;
    })
    .catch(error => { notifyConnection(false); throw error; })
    .finally(() => inFlight.delete(cacheKey));

  if (method === 'GET') inFlight.set(cacheKey, operation);
  return operation;
}

async function bootstrap(year = new Date().getFullYear()) {
  try { return await request('getBootstrap', { params:{ year }, maxAttempts:1, timeout:8000 }); }
  catch (error) {
    if (['UNAUTHORIZED','SETUP_REQUIRED'].includes(error.code)) throw error;
    return null;
  }
}

export const ping = () => request('ping', { fresh:true, ttl:0 });
export const getDashboard = async () => (await bootstrap())?.dashboard || request('getDashboard');

export const getLocacoes = async () => (await bootstrap())?.locacoes || request('getImoveis');
export const getLocacao = id => request('getImovel', { params:{ id } });
export const saveLocacao = data => request('saveImovel', { method:'POST', data });
export const importLocacoes = items => request('importLocacoes', { method:'POST', data:{ items } });

export const getFinanceiro = async year => (await bootstrap(Number(year) || new Date().getFullYear()))?.financeiro || request('getFinanceiro', { params:{ year } });
export const savePagamento = data => request('savePagamento', { method:'POST', data });
export const deletePagamento = id => request('deletePagamento', { method:'POST', data:{ id } });

export const getVendas = async () => (await bootstrap())?.vendas || request('getVendas');
export const getVenda = id => request('getVenda', { params:{ id } });
export const saveVenda = data => request('saveVenda', { method:'POST', data });

export const getConfig = async () => (await bootstrap())?.config || request('getConfig');
export const saveConfig = data => request('saveConfig', { method:'POST', data });
export const runAlertCheck = () => request('runAlertCheck', { method:'POST', data:{} });
export const setupSystem = () => request('setupSystem', { method:'POST', data:{} });
