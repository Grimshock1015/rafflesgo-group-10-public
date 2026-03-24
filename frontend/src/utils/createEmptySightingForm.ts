import type { SightingDraftFormData } from '../types/sightingDrafts';

export function createEmptySightingForm(): SightingDraftFormData {
  return {
    result: null,
    date: '',
    time: '',
    location: '',
    species: '',
    latitude: null,
    longitude: null,
    adults: null,
    juveniles: null,
    behaviour: '',
    notes: '',
    mediaUrl: '',
  };
}