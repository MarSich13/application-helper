export class CrmClient {
  constructor(baseUrl, email, password) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('CRM_BASE_URL must be an HTTP(S) origin');
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Non-local CRM connections require HTTPS');
    this.baseUrl = url.origin; this.email = email; this.password = password; this.cookies = new Map();
  }
  async request(path, { method = 'GET', json, form, csrf = true } = {}) {
    const headers = {};
    if (method !== 'GET' && csrf) {
      const token = await this.request('/api/auth/csrf');
      headers[token.headerName] = token.token;
    }
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const response = await fetch(this.baseUrl + path, {
      method, headers, redirect: 'error', signal: AbortSignal.timeout(30_000),
      body: json !== undefined ? JSON.stringify(json) : form ? new URLSearchParams(form).toString() : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0]; const separator = pair.indexOf('=');
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const content = await response.text();
    if (!response.ok) {
      // Do not include response bodies, passwords, cookies or CSRF tokens in logs.
      const error = new Error(`CRM ${method} ${path}: HTTP ${response.status}`);
      error.status = response.status; throw error;
    }
    return content ? JSON.parse(content) : null;
  }
  async login() {
    if (!this.email || !this.password) throw new Error('Collector credentials missing; run npm --prefix collector run setup');
    await this.request('/api/auth/login', { method: 'POST', form: { email: this.email, password: this.password } });
    return this.request('/api/auth/me');
  }
  async register() {
    return this.request('/api/auth/register', { method: 'POST', json: { email: this.email, password: this.password, displayName: 'LinkedIn Collector' } });
  }
  async import(payload) {
    if (payload.source !== 'linkedin' || !Array.isArray(payload.vacancies) || !payload.vacancies.length) throw new Error('Invalid LinkedIn import payload');
    const receipt = await this.request('/api/imports', { method: 'POST', json: payload });
    if (receipt.processed !== payload.vacancies.length || !Array.isArray(receipt.vacancyIds) || receipt.vacancyIds.length !== payload.vacancies.length
      || !Number.isInteger(receipt.created) || !Number.isInteger(receipt.updated) || receipt.created + receipt.updated !== receipt.processed) throw new Error('CRM did not confirm the complete import');
    return receipt;
  }
  async close() { await this.request('/api/auth/logout', { method: 'POST' }).catch(() => {}); }
}
