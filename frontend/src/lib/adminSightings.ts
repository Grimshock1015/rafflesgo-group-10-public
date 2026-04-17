import { OpenAPI } from '../api';

export type AdminSighting = {
  id: string;
  surveyWalkUid: string;
  result: string;
  date: string;
  time: string;
  location: string;
  species?: string;
  latitude?: number;
  longitude?: number;
  adults?: number;
  juveniles?: number;
  behaviour?: string;
  notes: string;
  submittedBy: string;
  mediaUrl?: string;
  createdAt: string;
};

export type AdminSightingStats = {
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

export async function listAllAdminSightings(options?: { limit?: number }): Promise<{ sightings: AdminSighting[] }> {
  const token = typeof OpenAPI.TOKEN === 'function' ? await OpenAPI.TOKEN({ method: 'GET', url: '/api/sightings' }) : OpenAPI.TOKEN;
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number') {
    params.set('limit', String(options.limit));
  }
  const query = params.toString();
  const url = `${OpenAPI.BASE}/api/sightings${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: OpenAPI.WITH_CREDENTIALS ? OpenAPI.CREDENTIALS : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to load admin sightings: ${response.status}`);
  }

  return response.json() as Promise<{ sightings: AdminSighting[] }>;
}

export function buildAdminSightingStats(sightingsInput: AdminSighting[]): AdminSightingStats {
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
  };
}

export async function listAdminSightingsForSurveyWalk(surveyWalkUid: string): Promise<{
  sightings: AdminSighting[];
  stats: AdminSightingStats;
}> {
  const { sightings } = await listAllAdminSightings();
  const filteredSightings = sightings.filter((sighting) => sighting.surveyWalkUid === surveyWalkUid);

  return {
    sightings: filteredSightings,
    stats: buildAdminSightingStats(filteredSightings),
  };
}
