import { openDB } from 'idb';
import { WALK_CACHE_STORE } from './SightingDraftsService';

// Reuse the same DB name/version so we're not opening multiple databases.
// The store was registered in SightingDraftsService's upgrade handler.
const DB_NAME = 'rafflesgo-db';
const DB_VERSION = 2;

export type CachedSurveyWalk = {
  uid: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  leader: { uid: string; name: string; photoURL?: string };
};

// One record per user — stores their leader walks and when we last fetched them
export type CachedSurveyWalks = {
  uid: string; // user uid, used as the store key
  walks: CachedSurveyWalk[];
  cachedAt: number;
};

async function getDB() {
  return openDB(DB_NAME, DB_VERSION);
}

export async function cacheSurveyWalks(userUid: string, walks: CachedSurveyWalk[]): Promise<void> {
  const db = await getDB();
  await db.put(WALK_CACHE_STORE, { uid: userUid, walks, cachedAt: Date.now() });
}

export async function getCachedSurveyWalks(userUid: string): Promise<CachedSurveyWalks | undefined> {
  const db = await getDB();
  return db.get(WALK_CACHE_STORE, userUid) as Promise<CachedSurveyWalks | undefined>;
}