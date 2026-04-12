import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { SightingDraft } from '../types/sightingDrafts';
import type { CachedSurveyWalks } from './SurveyWalkCacheService';

const DB_NAME = 'rafflesgo-db';
// bump version when adding new stores
const DB_VERSION = 2;
const STORE_NAME = 'sighting-drafts';
const WALK_CACHE_STORE = 'survey-walk-cache';

interface RafflesGoDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: SightingDraft;
  };
  [WALK_CACHE_STORE]: {
    key: string; // keyed by user uid
    value: CachedSurveyWalks;
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
        if (!db.objectStoreNames.contains(WALK_CACHE_STORE)) {
          db.createObjectStore(WALK_CACHE_STORE, { keyPath: 'uid' });
        }
      },
    });
  }

  return dbPromise;
}

export { WALK_CACHE_STORE };

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

export async function __clearDraftsForTests(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

export async function __resetDraftDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}