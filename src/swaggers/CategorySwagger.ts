import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/category/getallcategory',
  method: 'get',
  parameters: [
    {
      in: 'query',
      name: 'page',
      schema: { type: 'integer', default: 1 },
      description: 'Page number for pagination',
    },
    {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer', default: 10 },
      description: 'Number of categories per page',
    },
  ],
  responses: {
    200: {
      description: 'Categories retrieved successfully',
    },
    404: { description: 'No categories found' },
  },
  tags: ['Category'],
});

registerSwaggerRoute({
  path: '/category/addcategory',
  method: 'post',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Category name' },
            image: { type: 'string', description: 'Category image URL (optional)' },
            classify: { type: 'string', description: 'Category classification (optional)' },
            sub: { type: 'string', description: 'Subcategory ID (optional)' },
          },
          required: ['name'],
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Category created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Created successfully!' },
            },
          },
        },
      },
    },
    400: { description: 'Category already exists' },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/category/getcategorybyid/:id',
  method: 'get',
  summary: 'Get a category by ID',
  description: 'Retrieve a specific category by its ID.',
  parameters: [
    {
      in: 'path',
      name: 'id',
      schema: { type: 'string' },
      required: true,
      description: 'Category ID',
    },
  ],
  responses: {
    200: {
      description: 'Category retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'Category ID' },
              name: { type: 'string', description: 'Category name' },
              image: { type: 'string', description: 'Category image URL' },
              classify: { type: 'string', description: 'Category classification' },
              sub: { type: 'string', description: 'Subcategory ID (optional)' },
            },
          },
        },
      },
    },
    404: { description: 'Category not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
});

registerSwaggerRoute({
  path: '/category/updatecategory/:id',
  method: 'put',
  summary: 'Update a category',
  description: 'Update an existing category by its ID.',
  parameters: [
    {
      in: 'path',
      name: 'id',
      schema: { type: 'string' },
      required: true,
      description: 'Category ID',
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Category name (optional)' },
            image: { type: 'string', description: 'Category image URL (optional)' },
            classify: { type: 'string', description: 'Category classification (optional)' },
            sub: { type: 'string', description: 'Subcategory ID (optional)' },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Category updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Updated successfully!' },
            },
          },
        },
      },
    },
    404: { description: 'Category not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/category/deletecategory/:id',
  method: 'delete',
  summary: 'Delete a category',
  description: 'Delete a category by its ID. Cannot delete if it has subcategories.',
  parameters: [
    {
      in: 'path',
      name: 'id',
      schema: { type: 'string' },
      required: true,
      description: 'Category ID',
    },
  ],
  responses: {
    200: {
      description: 'Category deleted successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Deleted successfully!' },
            },
          },
        },
      },
    },
    400: { description: 'Cannot delete category with subcategories' },
    404: { description: 'Category not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/category/searchcategory',
  method: 'get',
  parameters: [
    {
      in: 'query',
      name: 'search',
      schema: { type: 'string' },
      description: 'Search query to match category name',
    },
  ],
  responses: {
    200: {
      description: 'Categories retrieved successfully',
    },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
});

registerSwaggerRoute({
  path: '/category/paginatecategory',
  method: 'get',
  summary: 'Paginate categories',
  description: 'Retrieve categories with pagination (handled by PaginateService).',
  parameters: [
    {
      in: 'query',
      name: 'page',
      schema: { type: 'integer', default: 1 },
      description: 'Page number for pagination',
    },
    {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer', default: 10 },
      description: 'Number of categories per page',
    },
  ],
  responses: {
    200: {
      description: 'Categories retrieved successfully with pagination',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total number of categories' },
              page: { type: 'integer', description: 'Current page number' },
              limit: { type: 'integer', description: 'Number of items per page' },
              totalPages: { type: 'integer', description: 'Total number of pages' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', description: 'Category ID' },
                    name: { type: 'string', description: 'Category name' },
                    image: { type: 'string', description: 'Category image URL' },
                    classify: { type: 'string', description: 'Category classification' },
                    sub: { type: 'string', description: 'Subcategory ID (optional)' },
                  },
                },
              },
            },
          },
        },
      },
    },
    500: { description: 'Internal server error' },
  },
  tags: ['Category'],
});
