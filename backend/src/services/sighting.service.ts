import { randomUUID } from 'crypto';
import { db } from '../lib/firebase-admin';

type CreateSightingInput = {
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

export async function createSighting(input: CreateSightingInput) {
  const id = randomUUID();

  const sighting = {
    id,
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

  await db.collection('sightings').doc(id).set(sighting);

  return sighting;
}