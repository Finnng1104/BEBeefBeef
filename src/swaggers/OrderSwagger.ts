import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/order/place-order',
  method: 'post',
  summary: 'Place an order',
  description:
    'Place an order with specified details. Requires authentication. Either `address_id` or `address` must be provided.',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          oneOf: [
            {
              required: ['address_id'],
              properties: {
                address_id: {
                  type: 'string',
                  description: 'ID of the saved address. Required if `address` is not provided.',
                },
              },
            },
            {
              required: ['address'],
              properties: {
                address: {
                  type: 'object',
                  description: 'Raw delivery address. Required if `address_id` is not provided.',
                  properties: {
                    full_name: { type: 'string' },
                    phone: { type: 'string' },
                    street: { type: 'string' },
                    ward: { type: 'string' },
                    district: { type: 'string' },
                    province: { type: 'string' },
                  },
                  required: ['full_name', 'phone', 'street', 'ward', 'district', 'province'],
                },
              },
            },
          ],
          properties: {
            payment_method: {
              type: 'string',
              description: 'Payment method for the order',
              example: 'cash',
            },
            delivery_type: {
              type: 'string',
              description: 'Type of delivery (e.g., standard, express)',
              example: 'standard',
            },
            order_type: {
              type: 'string',
              description: 'Type of the order (e.g., delivery, dine-in)',
              example: 'delivery',
            },
            delivery_time_type: {
              type: 'string',
              description: 'Type of delivery time (IMMEDIATE or SCHEDULED)',
              enum: ['IMMEDIATE', 'SCHEDULED'],
              example: 'IMMEDIATE',
            },
            scheduled_time: {
              type: 'string',
              format: 'date-time',
              description:
                'Scheduled delivery date and time (required if delivery_time_type is SCHEDULED)',
              example: '2023-09-25T15:30:00Z',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dish_id: { type: 'string' },
                  quantity: { type: 'integer' },
                  note: { type: 'string' },
                },
                required: ['dish_id', 'quantity'],
              },
            },
            note: {
              type: 'string',
              description: 'Optional note for the entire order',
              example: 'Giao hàng trước 12h trưa',
            },
          },
          required: ['payment_method', 'delivery_type', 'items'],
        },
      },
    },
    required: true,
  },
  responses: {
    '201': {
      description: 'Order placed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Order placed successfully',
              },
              order: {
                type: 'object',
                description: 'Details of the placed order',
                properties: {
                  _id: { type: 'string' },
                  user_id: { type: 'string' },
                  address_id: { type: 'string' },
                  payment_method: { type: 'string' },
                  delivery_type: { type: 'string' },
                  items_price: { type: 'number', description: 'Price of items before tax' },
                  vat_amount: { type: 'number', description: '8% VAT on items_price' },
                  shipping_fee: { type: 'number' },
                  total_amount: {
                    type: 'number',
                    description: 'Total price: items_price + vat_amount + shipping_fee',
                  },
                  total_quantity: {
                    type: 'number',
                    description: 'Total quantity of all items in the order',
                  },
                  payment_status: {
                    type: 'string',
                    enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
                    description: 'Payment status of the order',
                  },
                  note: { type: 'string', description: 'Note for the entire order' },
                  scheduled_time: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Scheduled delivery date and time',
                  },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Unauthorized',
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: ['Order'],
});

registerSwaggerRoute({
  path: '/order/all-orders',
  method: 'get',
  summary: 'Get all orders',
  description:
    'Retrieve a list of all orders with support for pagination, sorting, and filtering. Requires authentication and admin privileges.',
  parameters: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number for pagination.',
      required: false,
      schema: {
        type: 'integer',
        example: 1,
      },
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of orders per page.',
      required: false,
      schema: {
        type: 'integer',
        example: 10,
      },
    },
    {
      name: 'sortBy',
      in: 'query',
      description: 'Field to sort the orders by.',
      required: false,
      schema: {
        type: 'string',
        example: 'createdAt',
      },
    },
    {
      name: 'sortOrder',
      in: 'query',
      description: 'Order of sorting: `asc` for ascending or `desc` for descending.',
      required: false,
      schema: {
        type: 'string',
        enum: ['asc', 'desc'],
        example: 'desc',
      },
    },
    {
      name: 'filters[status]',
      in: 'query',
      description: 'Filter by order status.',
      required: false,
      schema: { type: 'string', example: 'PREPARING' },
    },
    {
      name: 'filters[payment_method]',
      in: 'query',
      description: 'Filter by payment method.',
      required: false,
      schema: { type: 'string', example: 'cash' },
    },
  ],
  responses: {
    '200': {
      description: 'Orders retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Orders retrieved successfully',
              },
              orders: {
                type: 'array',
                description: 'List of all orders',
                items: {
                  type: 'object',
                  properties: {
                    _id: {
                      type: 'string',
                      example: '661c4c8a8e81f705841e4e70',
                    },
                    user: {
                      type: 'string',
                      example: '661c4c0b8e81f705841e4d91',
                      description: 'ID of the user who placed the order',
                    },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          dish_id: { type: 'string' },
                          quantity: { type: 'integer' },
                          note: { type: 'string' },
                        },
                      },
                    },
                    payment_method: { type: 'string', example: 'cash' },
                    delivery_type: { type: 'string', example: 'standard' },
                    address: { type: 'string' },
                    total_price: { type: 'number', example: 350000 },
                    status: { type: 'string', example: 'pending' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: {
                type: 'integer',
                example: 100,
                description: 'Total number of orders available',
              },
              currentPage: {
                type: 'integer',
                example: 1,
                description: 'The current page number',
              },
              totalPages: {
                type: 'integer',
                example: 10,
                description: 'Total number of pages',
              },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Unauthorized',
              },
            },
          },
        },
      },
    },
    '500': {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Internal Server Error',
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: ['Order'],
});

registerSwaggerRoute({
  path: '/order/user-orders',
  method: 'get',
  summary: 'Get user orders',
  description: 'Retrieve all orders of the currently authenticated user. Requires authentication.',
  responses: {
    '200': {
      description: 'Orders retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Orders retrieved successfully',
              },
              orders: {
                type: 'array',
                description: "List of user's orders",
                items: {
                  type: 'object',
                  properties: {
                    _id: {
                      type: 'string',
                      example: '661c4c8a8e81f705841e4e70',
                    },
                    address_id: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        street: { type: 'string' },
                        city: { type: 'string' },
                        // thêm các trường khác nếu có
                      },
                    },
                    order_items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          dish_id: {
                            type: 'object',
                            properties: {
                              _id: { type: 'string' },
                              name: { type: 'string' },
                              price: { type: 'number' },
                              // thêm các trường khác nếu có
                            },
                          },
                          quantity: { type: 'integer' },
                          note: { type: 'string' },
                        },
                      },
                    },
                    payment_method: { type: 'string', example: 'cash' },
                    delivery_type: { type: 'string', example: 'express' },
                    total_price: { type: 'number', example: 250000 },
                    status: { type: 'string', example: 'delivered' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized - User not authenticated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Unauthorized' },
            },
          },
        },
      },
    },
    '500': {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Internal Server Error' },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: ['Order'],
});

registerSwaggerRoute({
  path: '/order/{id}',
  method: 'get',
  summary: 'Get order by ID',
  description:
    'Retrieve detailed information for a specific order by its ID. Requires authentication.',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'ID of the order to retrieve',
      schema: {
        type: 'string',
        example: '661c4c8a8e81f705841e4e70',
      },
    },
  ],
  responses: {
    '200': {
      description: 'Order retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Order retrieved successfully',
              },
              order: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  address_id: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      street: { type: 'string' },
                      city: { type: 'string' },
                      // thêm các trường khác nếu có
                    },
                  },
                  order_items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        dish_id: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' },
                            // thêm các trường khác nếu có
                          },
                        },
                        quantity: { type: 'integer' },
                        note: { type: 'string' },
                      },
                    },
                  },
                  payment_method: { type: 'string', example: 'cash' },
                  delivery_type: { type: 'string', example: 'standard' },
                  total_price: { type: 'number', example: 300000 },
                  total_quantity: {
                    type: 'number',
                    description: 'Total quantity of all items in the order',
                  },
                  payment_status: {
                    type: 'string',
                    enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
                    description: 'Payment status of the order',
                  },
                  note: { type: 'string', description: 'Note for the entire order' },
                  scheduled_time: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Scheduled delivery date and time',
                  },
                  status: { type: 'string', example: 'processing' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    '404': {
      description: 'Order not found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Order not found' },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized - User not authenticated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Unauthorized' },
            },
          },
        },
      },
    },
    '500': {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Internal Server Error' },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: ['Order'],
});

registerSwaggerRoute({
  path: '/order/order-status/{id}',
  method: 'put',
  summary: 'Update order status',
  description:
    'Update the delivery and overall status of a specific order by its ID. Requires authentication.',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'ID of the order to update',
      schema: {
        type: 'string',
        example: '661c4c8a8e81f705841e4e70',
      },
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: [
                'PENDING_PICKUP',
                'PICKED_UP',
                'IN_TRANSIT',
                'DELIVERED',
                'DELIVERY_FAILED',
                'RETURN_REQUESTED',
                'RETURNED',
                'CANCELLED',
              ],
              description: 'New delivery status of the order',
              example: 'DELIVERED',
            },
          },
          required: ['status'],
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Order status updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Order status updated successfully',
              },
              order: {
                $ref: '#/components/schemas/Order', // nếu bạn có định nghĩa trước
              },
            },
          },
        },
      },
    },
    '404': {
      description: 'Order not found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Order not found' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Invalid status value',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Invalid status',
              },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Unauthorized' },
            },
          },
        },
      },
    },
    '500': {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Error updating order status',
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: ['Order'],
});
