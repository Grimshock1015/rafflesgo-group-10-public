export const CreateSightingBodySchema = {
  $id: 'CreateSightingBody',
  type: 'object',
  required: ['surveyWalkUid', 'result', 'date', 'time', 'location'],
  properties: {
    surveyWalkUid: { type: 'string' },
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
      required: ['id', 'surveyWalkUid', 'result', 'date', 'time', 'location', 'notes', 'submittedBy'],
      properties: {
        id: { type: 'string' },
        surveyWalkUid: { type: 'string' },
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

export const MySightingsResponseSchema = {
  $id: 'MySightingsResponse',
  type: 'object',
  required: ['stats', 'sightings'],
  properties: {
    stats: {
      type: 'object',
      required: [
        'totalSubmissions',
        'sightedCount',
        'notSightedCount',
        'uniqueLocations',
        'totalAdults',
        'totalJuveniles',
        'speciesBreakdown',
      ],
      properties: {
        totalSubmissions: { type: 'number' },
        sightedCount: { type: 'number' },
        notSightedCount: { type: 'number' },
        uniqueLocations: { type: 'number' },
        totalAdults: { type: 'number' },
        totalJuveniles: { type: 'number' },
        latestSubmissionAt: { type: 'string' },
        speciesBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            required: ['species', 'count'],
            properties: {
              species: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    sightings: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'surveyWalkUid',
          'result',
          'date',
          'time',
          'location',
          'notes',
          'submittedBy',
          'createdAt',
        ],
        properties: {
          id: { type: 'string' },
          surveyWalkUid: { type: 'string' },
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
          createdAt: { type: 'string' },
        },
      },
    },
  },
} as const;

const SightingSchema = {
  type: 'object',
  required: [
    'id',
    'surveyWalkUid',
    'result',
    'date',
    'time',
    'location',
    'notes',
    'submittedBy',
    'createdAt',
  ],
  properties: {
    id: { type: 'string' },
    surveyWalkUid: { type: 'string' },
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
    createdAt: { type: 'string' },
  },
} as const;

export const AdminSightingsResponseSchema = {
  $id: 'AdminSightingsResponse',
  type: 'object',
  required: ['sightings'],
  properties: {
    sightings: {
      type: 'array',
      items: SightingSchema,
    },
  },
} as const;

export const DeleteSightingResponseSchema = {
  $id: 'DeleteSightingResponse',
  type: 'object',
  required: ['success', 'id'],
  properties: {
    success: { type: 'boolean' },
    id: { type: 'string' },
  },
} as const;
