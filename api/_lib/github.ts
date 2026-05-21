import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_API = 'https://api.github.com';

export interface GithubEnv {
  token: string;
  repo: string;
  branch: string;
  dataPath: string;
}

export function getEnv(): GithubEnv {
  const token = process.env.GITHUB_TOKEN ?? '';
  const repo = process.env.GITHUB_REPO ?? '';
  const branch = process.env.GITHUB_BRANCH ?? 'main';
  const dataPath = (process.env.GITHUB_DATA_PATH ?? 'data').replace(/^\/+|\/+$/g, '');
  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO env vars are required.');
  }
  return { token, repo, branch, dataPath };
}

export interface GithubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  download_url: string | null;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

async function fetchGithub(url: string, env: GithubEnv, accept = 'application/vnd.github+json'): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${env.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'compras-now-dashboard',
    },
  });
}

export async function getContents(path: string, env: GithubEnv): Promise<GithubContentItem | GithubContentItem[]> {
  const url = `${GITHUB_API}/repos/${env.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.branch)}`;
  const res = await fetchGithub(url, env);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub contents ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as GithubContentItem | GithubContentItem[];
}

export async function getFileText(path: string, env: GithubEnv): Promise<string> {
  const url = `${GITHUB_API}/repos/${env.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.branch)}`;
  const res = await fetchGithub(url, env, 'application/vnd.github.raw');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub raw ${path} -> ${res.status}: ${body}`);
  }
  return await res.text();
}

export async function getFileBuffer(path: string, env: GithubEnv): Promise<Buffer> {
  const url = `${GITHUB_API}/repos/${env.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.branch)}`;
  const res = await fetchGithub(url, env, 'application/vnd.github.raw');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub raw ${path} -> ${res.status}: ${body}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export function sendError(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
