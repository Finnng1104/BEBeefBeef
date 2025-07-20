import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/api/user/getAllUser',
  method: 'get',
  summary: 'Get all users',
  description: 'Fetch all users from the database',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of all users',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string', example: '123' },
                username: { type: 'string', example: 'johndoe' },
                email: { type: 'string', example: 'johndoe@example.com' },
                status: { type: 'string', example: 'active' },
              },
            },
          },
        },
      },
    },
    500: { description: 'Error fetching all users' },
  },
  tags: ['User'],
});

registerSwaggerRoute({
  path: '/api/user/getUserById/{userId}',
  method: 'get',
  summary: 'Get user by ID',
  description: 'Fetch a specific user by their ID',
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      description: 'ID of the user to retrieve',
      schema: {
        type: 'string',
        example: '123',
      },
    },
  ],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User details',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: '123' },
              username: { type: 'string', example: 'johndoe' },
              email: { type: 'string', example: 'johndoe@example.com' },
              status: { type: 'string', example: 'active' },
            },
          },
        },
      },
    },
    500: { description: 'Error fetching user by ID' },
  },
  tags: ['User'],
});

registerSwaggerRoute({
  path: '/api/user/blockUser/{userId}',
  method: 'post',
  summary: 'Block a user',
  description: 'Block a specific user by their ID',
  parameters: [
    {
      name: 'userId',
      in: 'path',
      required: true,
      description: 'ID of the user to block',
      schema: {
        type: 'string',
        example: '123',
      },
    },
  ],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User blocked successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'SUCCESS' },
              message: { type: 'string', example: 'User blocked successfully' },
            },
          },
        },
      },
    },
    500: { description: 'Error blocking user' },
  },
  tags: ['User'],
});

registerSwaggerRoute({
  path: '/api/user/filterUser',
  method: 'get',
  summary: 'Filter users',
  description: 'Filter users based on various criteria like name, email, status, etc.',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'nameSort',
      in: 'query',
      description: 'Sort by name: A->Z or Z->A',
      schema: {
        type: 'string',
        example: 'A->Z',
      },
    },
    {
      name: 'emailSort',
      in: 'query',
      description: 'Sort by email: A->Z or Z->A',
      schema: {
        type: 'string',
        example: 'A->Z',
      },
    },
    {
      name: 'status',
      in: 'query',
      description: 'Filter by user status (active, inactive, blocked)',
      schema: {
        type: 'string',
        example: 'active',
      },
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number for pagination',
      schema: {
        type: 'integer',
        example: 1,
      },
    },
    {
      name: 'pageSize',
      in: 'query',
      description: 'Number of users per page',
      schema: {
        type: 'integer',
        example: 10,
      },
    },
  ],
  responses: {
    200: {
      description: 'Filtered list of users',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string', example: '123' },
                username: { type: 'string', example: 'johndoe' },
                email: { type: 'string', example: 'johndoe@example.com' },
                status: { type: 'string', example: 'active' },
              },
            },
          },
        },
      },
    },
    500: { description: 'Error filtering users' },
  },
  tags: ['User'],
});
