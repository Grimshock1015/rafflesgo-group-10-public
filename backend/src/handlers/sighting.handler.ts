import type { FastifyReply, FastifyRequest } from 'fastify';
import { getContainer } from '../container';
import { createSighting, getMySightingsDashboard } from '../services/sighting.service';

export async function createSightingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { surveyWalkUid, result, date, time, location, species, latitude, longitude, adults, juveniles, behaviour, notes, mediaUrl } = request.body as {
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
    };

    if (!request.user?.uid) {
      return reply.code(401).send({
        message: 'User is not authenticated',
      });
    }

    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.getSurveyWalk(surveyWalkUid);

    if (surveyWalk.leader !== request.user.uid) {
      return reply.code(403).send({
        message: 'Only the survey walk leader can submit sightings for this walk',
      });
    }

    const sighting = await createSighting({
      surveyWalkUid,
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
      submittedBy: request.user.uid,
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
    if (!request.user?.uid) {
      return reply.code(400).send({
        message: 'Authenticated user does not have a uid',
      });
    }

    const dashboard = await getMySightingsDashboard(request.user.uid);
    return reply.code(200).send(dashboard);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      message: 'Failed to fetch your sightings',
    });
  }
}
