import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerCategoryRoutes(app: App, fastify: FastifyInstance) {
  // GET /api/service-categories
  fastify.get('/api/service-categories', {
    schema: {
      description: 'Get all available service categories',
      tags: ['categories'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    app.logger.info({}, 'Fetching service categories');

    try {
      const categories = await app.db
        .select()
        .from(schema.serviceCategories);

      app.logger.info({ count: categories.length }, 'Service categories fetched successfully');

      return categories;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch service categories');
      throw error;
    }
  });
}
