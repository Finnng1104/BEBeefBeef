import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { engine } from 'express-handlebars';
import { generateSwaggerSpec, getSwaggerRoutes } from './utils/swaggerOptions';
import AuthRoutes from './routes/AuthRoutes';
import UserRoutes from './routes/UserRoutes';
import RoleRoutes from './routes/RoleRouter';
import CateRoutes from './routes/CategoryRoutes';
import ProfileRoutes from './routes/ProfileRoutes';
import ReservationRoutes from './routes/ReservationRouter';
import TablesRouters from './routes/TableRouters';
import BannerRoutes from './routes/BannerRoutes';
import PostsRoutes from './routes/PostsRoutes';
import PostReportRoutes from './routes/PostReportRoutes';
import commentPostRoutes from './routes/CommentPostRoutes';

import StaffRoutes from './routes/StaffRoutes';
import FoodRoutes from './routes/FoodRoutes';
import PermissionRoutes from './routes/PermissionRoutes';
import OrderRoutes from './routes/OrderRoutes';
import AuthMiddleWare from './middleware/AuthMiddleWare';
import CartRouter from './routes/CartRoutes';
import FavoriteRoutes from './routes/FavoriteRoutes';
import AddressRouter from './routes/AddressRoutes';
import PaymentRoutes from './routes/PaymentRoutes';
import InventoryRoutes from './routes/InventoryRoutes';
import DashboardRoutes from './routes/DashboardRoutes';
import IngredientsRouter from './routes/IngredientsRouter';
import VoucherRoutes from './routes/VoucherRoutes';
import ReviewRoutes from './routes/ReviewRoutes';
import LoyaltyRoutes from './routes/LoyaltyRoutes';
import FaqRoutes from './routes/FaqRoutes';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import cors from 'cors';
import path from 'path';
import CronJobService from './services/CronJobService';

import { scheduleLoyaltyYearlyJob } from './cron/loyaltyYearlyJob';

const app = express();

// Import file authSwagger để đăng ký metadata
import './swaggers/AuthSwagger';
import './swaggers/OrderSwagger';
import './swaggers/FoodSwagger';
import './swaggers/CartSwagger';
import './swaggers/StaffSwagger';
import './swaggers/UserSwagger';
import './swaggers/CategorySwagger';
import TableReservationRouter from './routes/TableReservationRouter';

dotenv.config();
connectDB();

scheduleLoyaltyYearlyJob();

CronJobService.start();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);
app.engine('.hbs', engine({ extname: '.hbs', defaultLayout: false }));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

const port = process.env.PORT || 4000;

// Cấu hình Swagger
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    version: '1.0.0',
    description: 'API documentation for the application',
  },
  servers: [
    {
      url: `http://localhost:${port}/api`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const allRoutes = getSwaggerRoutes();

const swaggerSpec = generateSwaggerSpec(allRoutes, swaggerDefinition);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(passport.initialize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/auth', AuthRoutes);
app.use('/api/user', UserRoutes);
app.use('/api/profile', AuthMiddleWare.verifyToken, ProfileRoutes);
app.use(
  '/api/role',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin', 'manager']),
  RoleRoutes,
);
app.use('/api/permission', PermissionRoutes);
app.use('/api/category', CateRoutes);
app.use('/api/reservation', AuthMiddleWare.verifyToken, ReservationRoutes);
app.use('/api/banner', BannerRoutes);
app.use('/api/tables', TablesRouters);
app.use('/api/reservation', ReservationRoutes);
app.use('/api/my-reservations', AuthMiddleWare.verifyToken, ReservationRoutes);
app.use('/api/table-reservations', TableReservationRouter);

app.use(
  '/api/staff',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin', 'manager']),
  StaffRoutes,
);

app.use('/api/food', FoodRoutes);
app.use('/api/posts', PostsRoutes);
app.use('/api/post-reports', PostReportRoutes);
app.use('/api/posts', commentPostRoutes);
app.use('/api/order', AuthMiddleWare.verifyToken, OrderRoutes);
app.use('/api/cart', AuthMiddleWare.verifyToken, CartRouter);
app.use('/api/dashboard', AuthMiddleWare.verifyToken, DashboardRoutes);
app.use('/api/favorite', AuthMiddleWare.verifyToken, FavoriteRoutes);
app.use('/api/address', AuthMiddleWare.verifyToken, AddressRouter);
app.use('/api/payment', PaymentRoutes);
app.use('/api/review', ReviewRoutes);
app.use('/api/loyalty', LoyaltyRoutes);
app.use('/api/review', ReviewRoutes);

app.use('/api/ingredients', AuthMiddleWare.verifyToken, IngredientsRouter);
app.use('/api/inventory', AuthMiddleWare.verifyToken, InventoryRoutes);
app.use('/api/voucher', VoucherRoutes);
app.use('/api/faq', AuthMiddleWare.verifyToken, FaqRoutes);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Mongo URI:', process.env.MONGO_URI);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
