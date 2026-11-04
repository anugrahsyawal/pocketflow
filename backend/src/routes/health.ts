import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance, opts: FastifyPluginOptions & { readiness: () => Promise<boolean> }): Promise<void> {
  fastify.get('/ready', async (_request, reply) => {
    let ready = false;
    try { ready = await opts.readiness(); } catch { /* Fail closed without exposing database errors. */ }
    return reply.header('Cache-Control', 'no-store').status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'unavailable', service: 'pocketflow-api',
    });
  });
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status', 'service'],
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.header('Cache-Control', 'no-store').status(200).send({
        status: 'ok',
        service: 'pocketflow-api',
      });
    }
  );
}
