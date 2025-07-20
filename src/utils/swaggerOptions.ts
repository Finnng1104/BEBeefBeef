import { SwaggerDefinition } from 'swagger-jsdoc';

// Định nghĩa các type cho Swagger Options
export interface SwaggerOptions {
  path?: string;
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch';
  summary?: string;
  description?: string;
  responses?: { [key: string]: { description: string; content?: any } };
  requestBody?: {
    content: { [key: string]: { schema: any } };
    required?: boolean;
  };
  parameters?: Array<{
    in: 'query' | 'header' | 'path' | 'cookie';
    name: string;
    schema: any;
    required?: boolean;
    description?: string;
  }>;
  tags?: string[];
  security?: Array<{ [key: string]: string[] }>;
}

// Định nghĩa type cho Route Metadata
export interface RouteMetadata {
  path: string;
  method: string;
  summary: string;
  description: string;
  responses: { [key: string]: { description: string; content?: any } };
  requestBody?: {
    content: { [key: string]: { schema: any } };
    required?: boolean;
  };
  parameters: Array<{
    in: 'query' | 'header' | 'path' | 'cookie';
    name: string;
    schema: any;
    required?: boolean;
    description?: string;
  }>;
  tags: string[];
  security: Array<{ [key: string]: string[] }>;
}

// Biến toàn cục để lưu trữ tất cả metadata của các route
const swaggerRoutes: RouteMetadata[] = [];

// Hàm để đăng ký metadata Swagger cho một route
export function registerSwaggerRoute(options: SwaggerOptions) {
  const routeMetadata: RouteMetadata = {
    path: options.path || '',
    method: options.method || 'get',
    summary: options.summary || '',
    description: options.description || '',
    responses: options.responses || {
      200: { description: 'Success' },
    },
    requestBody: options.requestBody,
    parameters: options.parameters || [],
    tags: options.tags || [],
    security: options.security || [],
  };

  swaggerRoutes.push(routeMetadata);
}

// Hàm để lấy tất cả metadata đã đăng ký
export function getSwaggerRoutes(): RouteMetadata[] {
  return swaggerRoutes;
}

// Hàm để tạo Swagger specification từ metadata
export function generateSwaggerSpec(
  routes: RouteMetadata[],
  swaggerConfig: Partial<SwaggerDefinition>,
): SwaggerDefinition {
  const paths: { [key: string]: any } = {};

  routes.forEach((route) => {
    const path = route.path;
    const method = route.method.toLowerCase();

    if (!paths[path]) {
      paths[path] = {};
    }

    paths[path][method] = {
      summary: route.summary,
      description: route.description,
      responses: route.responses,
      requestBody: route.requestBody,
      parameters: route.parameters,
      tags: route.tags,
      security: route.security,
    };
  });

  return {
    ...swaggerConfig,
    info: swaggerConfig.info || {
      title: 'API Documentation',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication APIs',
        'x-order': 1,
      },
      {
        name: 'Cart',
        description: 'Cart APIs',
        'x-order': 2,
      },
    ],
    paths,
  };
}
