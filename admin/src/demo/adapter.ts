import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { demoRequest } from './hub';

/** The path below /api/v1, with the query string, exactly as axios would have sent it. */
function pathOf(config: InternalAxiosRequestConfig): string {
  const url = new URL(axios.getUri(config), window.location.origin);
  return `${url.pathname.replace(/^.*?\/api\/v1/, '')}${url.search}`;
}

/** The request body as the hub takes it: parsed JSON, or a form's fields (files stay File objects — an upload). */
function bodyOf(data: unknown): unknown {
  if (data instanceof FormData) return { __formData: [...data.entries()] };
  if (typeof data === 'string' && data) {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data ?? undefined;
}

/**
 * The demo build's axios transport (lib/api.ts): the same requests, answered by the visitor's copy of the shop instead of
 * the network — and the same responses and errors, so every page, form and error message of the admin works unchanged.
 */
export const demoAdapter: AxiosAdapter = async (config) => {
  const reply = await demoRequest((config.method ?? 'get').toUpperCase(), pathOf(config), bodyOf(config.data));
  const response: AxiosResponse = {
    data: reply.body,
    status: reply.status,
    statusText: String(reply.status),
    headers: new AxiosHeaders({ 'content-type': 'application/json' }),
    config,
    request: null,
  };
  const validate = config.validateStatus ?? ((status: number) => status >= 200 && status < 300);
  if (validate(reply.status)) return response;
  throw new AxiosError(
    `Request failed with status code ${reply.status}`,
    reply.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    response
  );
};
