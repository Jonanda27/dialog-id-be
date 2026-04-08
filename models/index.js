import { Sequelize } from 'sequelize';
import dbConfig from '../config/database.cjs';

// Import Models
import User from './User.js';
import Store from './Store.js';
import Product from './Product.js';
import ProductMedia from './ProductMedia.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Escrow from './Escrow.js';
import WalletTransaction from './WalletTransaction.js';
import GradingRequest from './GradingRequest.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Inisialisasi koneksi Sequelize
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
});

// Daftarkan model ke dalam object
const models = {
  User: User.init(sequelize),
  Store: Store.init(sequelize),
  Product: Product.init(sequelize),
  ProductMedia: ProductMedia.init(sequelize),
  Order: Order.init(sequelize),
  OrderItem: OrderItem.init(sequelize),
  Escrow: Escrow.init(sequelize),
  WalletTransaction: WalletTransaction.init(sequelize),
  GradingRequest: GradingRequest.init(sequelize),
};

// Eksekusi fungsi associate() jika ada di dalam model
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

export { sequelize, Sequelize };
export default models;