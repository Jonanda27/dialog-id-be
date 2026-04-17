import express from 'express';
import http from 'http'; // [NEW] Modul bawaan Node.js
import { Server } from 'socket.io'; // [NEW] Import Socket.io Server
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import Middlewares & Utils
import { errorHandler } from './middlewares/errorHandler.js';
import { errorResponse, successResponse } from './utils/apiResponse.js';

// Import Socket Controllers (Modul Lelang)
import initializeAuctionSocket from './socket/auctionSocket.js'; // [NEW]

// Import Routes
import authRoutes from './routes/authRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';

// Load environment variables
dotenv.config();

// Inisialisasi Express & Raw HTTP Server
const app = express();
const server = http.createServer(app); // [NEW] Membungkus Express untuk kapabilitas WebSocket

// ==========================================
// STATIC FILES SERVER
// ==========================================
app.use('/public', express.static('public'));

// ==========================================
// 1. GLOBAL MIDDLEWARES & SECURITY
// ==========================================
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
// 2. WEBSOCKET (SOCKET.IO) INITIALIZATION
// ==========================================
// [NEW] Mengikat Socket.io ke HTTP Server dengan konfigurasi CORS yang ekuivalen
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Mendaftarkan logic Controller untuk namespace Auction
initializeAuctionSocket(io);


// ==========================================
// 3. SWAGGER UI CONFIGURATION
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
// 4. ROUTING MOUNT POINTS
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
app.use('/api/reviews', reviewRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/v1/auctions', auctionRoutes); 


// ==========================================
// 5. 404 & GLOBAL ERROR HANDLING
// ==========================================
app.use((req, res) => {
  return errorResponse(res, 404, `Can't find ${req.originalUrl} on this server`);
});

// Global Error Handler Middleware
app.use(errorHandler);


// ==========================================
// 6. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

// [FIX] Menggunakan server.listen alih-alih app.listen agar trafik HTTP dan WS dikelola oleh layer yang sama
server.listen(PORT, () => {
  console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[SWAGGER] Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`[WEBSOCKET] Socket.io engine is ready and attached to HTTP Server`);
});

// Mengekspor app (Express) untuk keperluan integrasi testing (Jest/Supertest) jika diperlukan
export default app;