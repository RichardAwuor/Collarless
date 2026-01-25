import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerUploadRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/upload/provider-photo (deprecated - use profile-picture instead)
  fastify.post('/api/upload/provider-photo', {
    schema: {
      description: 'Upload provider profile photo (deprecated)',
      tags: ['uploads'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ url: string } | void> => {
    app.logger.info({}, 'Uploading provider photo');

    try {
      const data = await request.file();
      if (!data) {
        app.logger.warn({}, 'No file provided in upload');
        return reply.status(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const timestamp = Date.now();
      const filename = `provider-photos/${timestamp}-${data.filename}`;

      const key = await app.storage.upload(filename, buffer);
      const { url } = await app.storage.getSignedUrl(key);

      app.logger.info({ key, filename }, 'Provider photo uploaded successfully');

      return { url };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload provider photo');
      throw error;
    }
  });

  // POST /api/upload/profile-picture
  fastify.post('/api/upload/profile-picture', {
    schema: {
      description: 'Upload service provider profile picture',
      tags: ['uploads'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            filename: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ url: string; filename: string } | void> => {
    app.logger.info({}, 'Uploading profile picture');

    try {
      const data = await request.file();
      if (!data) {
        app.logger.warn({}, 'No image provided in upload');
        return reply.status(400).send({ error: 'No image provided' });
      }

      const buffer = await data.toBuffer();
      const timestamp = Date.now();
      const filename = `profile-pictures/${timestamp}-${data.filename}`;

      const key = await app.storage.upload(filename, buffer);
      const { url } = await app.storage.getSignedUrl(key);

      app.logger.info({ key, filename }, 'Profile picture uploaded successfully');

      return { url, filename };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload profile picture');
      throw error;
    }
  });
}
