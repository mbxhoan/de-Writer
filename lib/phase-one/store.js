import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createSeedState } from './seed.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'workspace-state.json');

let mutationQueue = Promise.resolve();

async function ensureStateFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, 'utf8');
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(createSeedState(), null, 2), 'utf8');
  }
}

export async function readState() {
  await ensureStateFile();
  return JSON.parse(await readFile(DATA_FILE, 'utf8'));
}

async function writeState(state) {
  state.meta.updatedAt = new Date().toISOString();
  state.workspace.updatedAt = state.meta.updatedAt;
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export async function mutateState(mutator) {
  const task = mutationQueue.then(async () => {
    const state = await readState();
    const result = await mutator(state);
    await writeState(state);
    return result;
  });

  mutationQueue = task.catch(() => {});
  return task;
}
