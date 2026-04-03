import type { FastifyReply, FastifyRequest } from 'fastify';
import { createSighting, getMySightingsDashboard } from '../services/sighting.service';

export async function createSightingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { result, date, time, location, species, latitude, longitude, adults, juveniles, behaviour, notes, mediaUrl } = request.body as {
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
    };

    const user = request.user as { email?: string } | undefined;

    const sighting = await createSighting({
      result,
      date,
      time,
      location,
      species,
      latitude,
      longitude,
      adults,
      juveniles,
      behaviour,
      notes,
      mediaUrl,
      submittedBy: user?.email || 'unknown',
    });

    return reply.code(201).send({
      message: 'Sighting submitted successfully',
      sighting,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      message: 'Failed to submit sighting',
    });
  }
}

export async function getMySightingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const user = request.user as { email?: string } | undefined;

    if (!user?.email) {
      return reply.code(400).send({
        message: 'Authenticated user does not have an email address',
      });
    }

    const dashboard = await getMySightingsDashboard(user.email);
    return reply.code(200).send(dashboard);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      message: 'Failed to fetch your sightings',
    });
  }
}
