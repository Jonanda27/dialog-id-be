import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import Middlewares & Utils
import { errorHandler } from './middlewares/errorHandler.js';
import { errorResponse, successResponse } from './utils/apiResponse.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// ==========================================
// STATIC FILES SERVER
// ==========================================
app.use('/public', express.static('public'));

// ==========================================
// 1. GLOBAL MIDDLEWARES & SECURITY
// ==========================================
/**
 * ⚡ PEMBARUAN SECURITY POLICY:
 * Mengizinkan pemuatan resource video (streaming) lintas origin (CORS) 
 * untuk mengatasi error ERR_BLOCKED_BY_RESPONSE.NotSameOrigin.
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser (JSON & URL-encoded)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


// ==========================================
// 2. SWAGGER UI CONFIGURATION
// ==========================================
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Analog.id API',
      version: '1.0.0',
      description: 'Enterprise API Documentation for Analog.id Marketplace',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// ==========================================
// 3. ROUTING MOUNT POINTS
// ==========================================
// Health Check Endpoint
app.get('/health', (req, res) => {
  return successResponse(res, 200, 'Analog.id API is up and running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/disputes', disputeRoutes);


// ==========================================
// 4. 404 & GLOBAL ERROR HANDLING
// ==========================================
app.use((req, res) => {
  return errorResponse(res, 404, `Can't find ${req.originalUrl} on this server`);
});

// Global Error Handler Middleware
app.use(errorHandler);


// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[SWAGGER] Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;