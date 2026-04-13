import { Sequelize } from 'sequelize';
import dbConfig from '../config/database.cjs';

// Import Models
import User from './User.js'; // User adalah Class
import Store from './Store.js';
import CategoryInit from './Category.js';
import SubCategoryInit from './SubCategory.js';
import Product from './Product.js';
import ProductMedia from './ProductMedia.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Escrow from './Escrow.js';
import WalletTransaction from './WalletTransaction.js';
import GradingRequest from './GradingRequest.js';
import Review from './Review.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  define: {
    underscored: true,
  }
});

// ⚡ PERBAIKAN STRATEGIS:
// Kita harus membedakan mana yang merupakan Class (panggil .init) 
// dan mana yang merupakan fungsi inisialisasi biasa.
const models = {
  // User adalah ES6 Class, panggil static method init-nya
  User: User.init(sequelize),

  // Model lainnya menggunakan functional pattern (sequelize) => Model
  Store: Store.init(sequelize),
  Category: CategoryInit(sequelize),
  SubCategory: SubCategoryInit(sequelize),
  Product: Product.init(sequelize),
  ProductMedia: ProductMedia.init(sequelize),
  Order: Order.init(sequelize),
  OrderItem: OrderItem.init(sequelize),
  Escrow: Escrow.init(sequelize),
  WalletTransaction: WalletTransaction.init(sequelize),
  GradingRequest: GradingRequest.init(sequelize),
  Review: Review.init(sequelize),
};

// Eksekusi associate()
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

export { sequelize, Sequelize };
export default models;