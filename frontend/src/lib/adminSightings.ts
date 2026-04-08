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

export async function listAllAdminSightings(): Promise<{ sightings: AdminSighting[] }> {
  const token = typeof OpenAPI.TOKEN === 'function' ? await OpenAPI.TOKEN({ method: 'GET', url: '/api/sightings' }) : OpenAPI.TOKEN;
  const response = await fetch(`${OpenAPI.BASE}/api/sightings`, {
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
