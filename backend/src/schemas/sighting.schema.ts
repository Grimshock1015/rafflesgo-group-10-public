export const CreateSightingBodySchema = {
  $id: 'CreateSightingBody',
  type: 'object',
  required: ['result', 'date', 'time', 'location'],
  properties: {
    result: {
      type: 'string',
      enum: ['sighted', 'not_sighted'],
    },
    date: { type: 'string' },
    time: { type: 'string' },
    location: { type: 'string' },
    species: { type: 'string' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },
    adults: { type: 'number' },
    juveniles: { type: 'number' },
    behaviour: { type: 'string' },
    notes: { type: 'string' },
    mediaUrl: { type: 'string' },
  },
} as const;

export const CreateSightingResponseSchema = {
  $id: 'CreateSightingResponse',
  type: 'object',
  required: ['message', 'sighting'],
  properties: {
    message: { type: 'string' },
    sighting: {
      type: 'object',
      required: ['id', 'result', 'date', 'time', 'location', 'notes', 'submittedBy'],
      properties: {
        id: { type: 'string' },
        result: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        location: { type: 'string' },
        species: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        adults: { type: 'number' },
        juveniles: { type: 'number' },
        behaviour: { type: 'string' },
        notes: { type: 'string' },
        submittedBy: { type: 'string' },
        mediaUrl: { type: 'string' },
      },
    },
  },
} as const;