import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { SightingDraft } from '../types/sightingDrafts';

const DB_NAME = 'rafflesgo-db';
const DB_VERSION = 1;
const STORE_NAME = 'sighting-drafts';

interface RafflesGoDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: SightingDraft;
  };
}

let dbPromise: Promise<IDBPDatabase<RafflesGoDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RafflesGoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

export async function saveDraft(draft: SightingDraft): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, draft);
}

export async function getDraft(id: string): Promise<SightingDraft | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllDrafts(): Promise<SightingDraft[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function updateDraftStatus(
  id: string,
  status: SightingDraft['status'],
  lastError?: string | null
): Promise<void> {
  const db = await getDB();
  const draft = await db.get(STORE_NAME, id);

  if (!draft) {
    throw new Error(`Draft ${id} not found`);
  }

  draft.status = status;
  draft.updatedAt = Date.now();
  draft.lastError = lastError ?? null;

  await db.put(STORE_NAME, draft);
}

export async function getDraftsByStatus(
  status: SightingDraft['status']
): Promise<SightingDraft[]> {
  const db = await getDB();
  const drafts = await db.getAll(STORE_NAME);
  return drafts.filter((draft) => draft.status === status);
}