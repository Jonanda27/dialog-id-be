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

// Load environment variables
dotenv.config();

const app = express();

// ==========================================
// 1. GLOBAL MIDDLEWARES & SECURITY
// ==========================================
// Set security HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// HTTP Request Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser (JSON & URL-encoded)
app.use(express.json({ limit: '1mb' })); // Prevent large payloads
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
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Path menuju file yang berisi anotasi JSDoc Swagger
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

// Mount Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);

// ==========================================
// 4. 404 & GLOBAL ERROR HANDLING
// ==========================================
// Handle unmapped routes (Express 5 Compatible)
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