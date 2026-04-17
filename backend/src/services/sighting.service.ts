import { randomUUID } from 'crypto';
import { db } from '../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../lib/firestore-collections';

type CreateSightingInput = {
  surveyWalkUid: string;
  result: 'sighted' | 'not_sighted';
  date: string;
  time: string;
  location: string;
  species?: string;
  latitude?: number;
  longitude?: number;
  adults?: number;
  juveniles?: number;
  behaviour?: string;
  notes?: string;
  mediaUrl?: string;
  submittedBy: string;
};

export type StoredSighting = {
  id: string;
  surveyWalkUid: string;
  result: 'sighted' | 'not_sighted';
  date: string;
  time: string;
  location: string;
  species: string | null;
  latitude: number | null;
  longitude: number | null;
  adults: number | null;
  juveniles: number | null;
  behaviour: string | null;
  notes: string;
  mediaUrl: string;
  submittedBy: string;
  createdAt: string;
};

export type MySightingsDashboard = {
  stats: {
    totalSubmissions: number;
    sightedCount: number;
    notSightedCount: number;
    uniqueLocations: number;
    totalAdults: number;
    totalJuveniles: number;
    latestSubmissionAt?: string;
    speciesBreakdown: Array<{
      species: string;
      count: number;
    }>;
  };
  sightings: StoredSighting[];
};

export async function createSighting(input: CreateSightingInput) {
  const id = randomUUID();

  const sighting: StoredSighting = {
    id,
    surveyWalkUid: input.surveyWalkUid,
    result: input.result,
    date: input.date,
    time: input.time,
    location: input.location,
    species: input.species ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    adults: input.adults ?? null,
    juveniles: input.juveniles ?? null,
    behaviour: input.behaviour ?? null,
    notes: input.notes || '',
    mediaUrl: input.mediaUrl || '',
    submittedBy: input.submittedBy,
    createdAt: new Date().toISOString(),
  };

  await db.collection(FIRESTORE_COLLECTIONS.SIGHTINGS).doc(id).set(sighting);

  return sighting;
}

export async function getMySightingsDashboard(
  submittedBy: string,
  options?: { limit?: number },
): Promise<MySightingsDashboard> {
  const snapshot = await db
    .collection(FIRESTORE_COLLECTIONS.SIGHTINGS)
    .where('submittedBy', '==', submittedBy)
    .get();

  const sightings = snapshot.docs.map((doc) => doc.data() as StoredSighting);
  return buildSightingsDashboard(sightings, options?.limit);
}

export async function getAllSightings(options?: { limit?: number }): Promise<StoredSighting[]> {
  const snapshot = await db.collection(FIRESTORE_COLLECTIONS.SIGHTINGS).get();
  const sortedSightings = snapshot.docs
    .map((doc) => doc.data() as StoredSighting)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (!options?.limit) {
    return sortedSightings;
  }

  return sortedSightings.slice(0, options.limit);
}

export async function deleteSighting(id: string): Promise<void> {
  await db.collection(FIRESTORE_COLLECTIONS.SIGHTINGS).doc(id).delete();
}

function buildSightingsDashboard(sightingsInput: StoredSighting[], listLimit?: number): MySightingsDashboard {
  const sightings = [...sightingsInput].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const speciesCounts = new Map<string, number>();
  let sightedCount = 0;
  let notSightedCount = 0;
  let totalAdults = 0;
  let totalJuveniles = 0;

  for (const sighting of sightings) {
    if (sighting.result === 'sighted') {
      sightedCount += 1;
    } else {
      notSightedCount += 1;
    }

    totalAdults += sighting.adults ?? 0;
    totalJuveniles += sighting.juveniles ?? 0;

    if (sighting.species) {
      speciesCounts.set(sighting.species, (speciesCounts.get(sighting.species) ?? 0) + 1);
    }
  }

  return {
    stats: {
      totalSubmissions: sightings.length,
      sightedCount,
      notSightedCount,
      uniqueLocations: new Set(sightings.map((sighting) => sighting.location)).size,
      totalAdults,
      totalJuveniles,
      latestSubmissionAt: sightings[0]?.createdAt,
      speciesBreakdown: [...speciesCounts.entries()]
        .map(([species, count]) => ({ species, count }))
        .sort((left, right) => right.count - left.count || left.species.localeCompare(right.species)),
    },
    sightings: listLimit ? sightings.slice(0, listLimit) : sightings,
  };
}
