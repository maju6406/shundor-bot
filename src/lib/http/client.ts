import { request } from 'undici';

export async function getJson<T>(url: string): Promise<T> {
  const { body, statusCode } = await request(url, { method: 'GET' });
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode} from ${url}`);
  }
  return (await body.json()) as T;
}
