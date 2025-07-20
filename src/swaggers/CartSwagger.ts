import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/cart/getCart',
  method: 'get',
  responses: {
    200: {
      description: 'Cart items retrieved successfully',
    },
    401: { description: 'User not authenticated' },
    404: { description: 'Cart not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Cart'],
  security: [{ bearerAuth: [] }],
});
registerSwaggerRoute({
  path: '/cart/add',
  method: 'post',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            dishId: {
              type: 'string',
              description: 'Dish ID to add to cart',
            },
            quantity: {
              type: 'integer',
              description: 'Quantity to add (must be greater than 0)',
            },
          },
          required: ['dishId', 'quantity'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item added to cart successfully',
    },
    400: { description: 'Invalid input or quantity' },
    404: { description: 'Dish not found or unavailable' },
    500: { description: 'Internal server error' },
  },
  tags: ['Cart'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/cart/update',
  method: 'put',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            dishId: { type: 'string', description: 'Dish ID to update' },
            quantity: { type: 'integer', description: 'New quantity' },
          },
          required: ['dishId', 'quantity'],
        },
      },
    },
  },
  responses: {
    200: { description: 'Cart updated successfully' },
    400: { description: 'Invalid input or quantity' },
    404: { description: 'Dish not found or unavailable' },
    500: { description: 'Internal server error' },
  },
  tags: ['Cart'],
  security: [{ bearerAuth: [] }],
});

registerSwaggerRoute({
  path: '/cart/item/{dishId}',
  method: 'delete',
  summary: 'Delete a specific item from the cart',
  description:
    'Remove a dish from the cart by dishId. The cart is identified by the authenticated user.',
  parameters: [
    {
      in: 'path',
      name: 'dishId',
      schema: { type: 'string' },
      required: true,
      description: 'Dish ID to remove from cart',
    },
  ],
  responses: {
    200: { description: 'Cart item deleted successfully' },
    400: { description: 'Missing dishId' },
    404: { description: 'Cart or item not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Cart'],
  security: [{ bearerAuth: [] }],
});
registerSwaggerRoute({
  path: '/cart/delete-all/{cartId}',
  method: 'delete',
  summary: 'Delete all items in the cart',
  description: 'Remove all dishes in the cart, keeping the cart itself.',
  parameters: [
    {
      in: 'path',
      name: 'cartId',
      schema: { type: 'string' },
      required: true,
      description: 'Cart ID',
    },
  ],
  responses: {
    200: { description: 'All items deleted successfully' },
    400: { description: 'Missing cartId' },
    404: { description: 'Cart not found' },
    500: { description: 'Internal server error' },
  },
  tags: ['Cart'],
  security: [{ bearerAuth: [] }],
});
