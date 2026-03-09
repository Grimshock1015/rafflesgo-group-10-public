import type { FastifyReply, FastifyRequest } from 'fastify';
import { createSighting } from '../services/sighting.service';

export async function createSightingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { result, date, time, location, notes, mediaUrl } = request.body as {
      result: 'sighted' | 'not_sighted';
      date: string;
      time: string;
      location: string;
      notes?: string;
      mediaUrl?: string;
    };

    const user = request.user as { email?: string } | undefined;

    const sighting = await createSighting({
      result,
      date,
      time,
      location,
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