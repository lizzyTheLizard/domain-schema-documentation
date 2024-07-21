/* eslint-disable jsdoc/require-jsdoc */
export function fullSpec (): any {
  return {
    openapi: '3.0.2',
    info: { title: 'test', description: 'test2', version: '1' },
    servers: [{ url: 'www.google.com' }],
    paths: {
      '/pet': {
        put: {
          tags: ['pet'],
          summary: 'Update an existing pet',
          description: 'Update an existing pet by Id',
          operationId: 'updatePet',
          responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { type: 'object' } } } } }
        }
      }
    },
    components: {
      schemas: { Test: { type: 'object' } },
      securitySchemes: { api_key: { type: 'apiKey', name: 'api_key', in: 'header' } }
    }
  }
}

export function refSpec (): any {
  return {
    paths: {
      '/pet': {
        put: {
          tags: ['pet'],
          summary: 'Update an existing pet',
          description: 'Update an existing pet by Id',
          operationId: 'updatePet',
          responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Test' } } } } }
        }
      }
    },
    components: {
      schemas: {
        Test: {
          type: 'object',
          properties: {
            TestP: { $ref: './Schema.yaml' },
            TestP2: { $ref: '/Module/Schema.yaml' },
            TestP3: { $ref: '#/components/schemas/Test' }
          }
        }
      }
    }
  }
}

export function refSpecInterface (): any {
  return {
    paths: {
      '/pet': {
        put: {
          tags: ['pet'],
          summary: 'Update an existing pet',
          description: 'Update an existing pet by Id',
          operationId: 'updatePet',
          responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '../Module/Interface.yaml' } } } } }
        }
      }
    }
  }
}
