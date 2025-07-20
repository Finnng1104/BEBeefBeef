import { registerSwaggerRoute } from '../utils/swaggerOptions';

registerSwaggerRoute({
  path: '/auth/register',
  method: 'post',
  summary: 'User registration',
  description: 'Register a new user with username, email, password, phone, and optional roles',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'johndoe@example.com' },
            password: { type: 'string', example: 'Password123' },
            confirmPassword: { type: 'string', example: 'Password123' },
            phone: { type: 'string', example: '+12345678901' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['507f1f77bcf86cd799439011'],
            },
          },
          required: ['username', 'email', 'password', 'confirmPassword', 'phone'],
        },
      },
    },
    required: true,
  },
  responses: {
    201: { description: 'User created successfully' },
    400: { description: 'Bad request - Invalid input or role ID format' },
  },
  tags: ['Auth'],
});

registerSwaggerRoute({
  path: '/auth/login',
  method: 'post',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'johndoe@example.com' },
            password: { type: 'string', example: 'Password123' },
          },
          required: ['email', 'password'],
        },
      },
    },
    required: true,
  },
  responses: {
    200: { description: 'User logged in successfully' },
    400: {
      description:
        'Bad request - Possible issues include: missing email or password, invalid email format, unregistered email, or invalid credentials, Email not registered',
    },
  },
  tags: ['Auth'],
});

// Swagger cho /auth/send-otpEmail
registerSwaggerRoute({
  path: '/auth/send-otpEmail',
  method: 'post',
  summary: 'Send OTP via email',
  description: 'Send an OTP to the user via email for verification',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'johndoe@example.com' },
          },
          required: ['email'],
        },
      },
    },
    required: true,
  },
  responses: {
    200: { description: 'OTP sent successfully' },
    400: { description: 'Invalid email format | Service error' },
  },
  tags: ['Auth'],
});

// Swagger cho /auth/verify-otpEmail
registerSwaggerRoute({
  path: '/auth/verify-otpEmail',
  method: 'post',
  summary: 'Verify OTP via email',
  description: 'Verify the OTP sent to the user via email',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'johndoe@example.com' },
            otp: { type: 'string', example: '123456' },
          },
          required: ['email', 'otp'],
        },
      },
    },
    required: true,
  },
  responses: {
    200: { description: 'OTP verification response' },
    400: { description: 'Email and OTP are required | Verification error' },
  },
  tags: ['Auth'],
});
