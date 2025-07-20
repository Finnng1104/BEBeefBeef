import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/staff/getAllStaff',
  method: 'get',
  summary: 'Get all staff',
  description: 'Fetches all staff members, with optional pagination',
  responses: {
    200: { description: 'Successfully fetched staff' },
    500: { description: 'Internal server error' },
  },
  tags: ['Staff'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/staff/createStaff',
  method: 'post',
  summary: 'Create a new staff member',
  description: 'Creates a new staff member with the provided details',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+123456789' },
            role: { type: 'string', example: 'admin' },
          },
          required: ['name', 'email', 'role'],
        },
      },
    },
    required: true,
  },
  responses: {
    201: { description: 'Staff created successfully' },
    400: { description: 'Bad request - Missing or invalid parameters' },
    500: { description: 'Internal server error' },
  },
  tags: ['Staff'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/staff/updateStaff/{staffId}',
  method: 'put',
  summary: 'Update staff details',
  description: 'Updates the details of a specific staff member',
  parameters: [
    {
      in: 'path',
      name: 'staffId',
      required: true,
      schema: {
        type: 'string',
        example: '60c72b2f9f1b2c001c8b8d3d',
      },
      description: 'The ID of the staff member to update',
    },
  ],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe Updated' },
            email: { type: 'string', example: 'john.doe.updated@example.com' },
            phone: { type: 'string', example: '+1234567890' },
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'Staff updated successfully' },
    400: { description: 'Bad request - Invalid input' },
    404: { description: 'Staff not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Staff'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/staff/deleteStaff/{staffId}',
  method: 'delete',
  summary: 'Delete a staff member',
  description: 'Deletes a specific staff member by ID',
  parameters: [
    {
      in: 'path',
      name: 'staffId',
      required: true,
      schema: {
        type: 'string',
        example: '60c72b2f9f1b2c001c8b8d3d',
      },
      description: 'The ID of the staff member to delete',
    },
  ],
  responses: {
    200: { description: 'Staff deleted successfully' },
    404: { description: 'Staff not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Staff'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/staff/filterStaff',
  method: 'get',
  summary: 'Filter staff by criteria',
  description: 'Filters staff members based on various criteria like name, email, status, etc.',
  parameters: [
    { in: 'query', name: 'nameSort', schema: { type: 'string' } },
    { in: 'query', name: 'emailSort', schema: { type: 'string' } },
    { in: 'query', name: 'gender', schema: { type: 'string' } },
    { in: 'query', name: 'status', schema: { type: 'string' } },
    { in: 'query', name: 'startDate', schema: { type: 'string' } },
    { in: 'query', name: 'endDate', schema: { type: 'string' } },
    { in: 'query', name: 'page', schema: { type: 'integer' } },
    { in: 'query', name: 'pageSize', schema: { type: 'integer' } },
  ],
  responses: {
    200: { description: 'Filtered staff results' },
    500: { description: 'Internal server error' },
  },
  tags: ['Staff'],
  security: [{ bearerAuth: [] }],
});
