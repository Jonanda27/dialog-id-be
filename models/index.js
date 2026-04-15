import { Sequelize } from 'sequelize';
import dbConfig from '../config/database.cjs';

// Import Models
import User from './User.js';
import Store from './Store.js';
import Category from './Category.js';
import SubCategory from './SubCategory.js';
import Product from './Product.js';
import ProductMedia from './ProductMedia.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Escrow from './Escrow.js';
import WalletTransaction from './WalletTransaction.js';
import GradingRequest from './GradingRequest.js';
import AddressInit from './Address.js';

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
  Category: Category.init(sequelize),
  SubCategory: SubCategory.init(sequelize),
  Product: Product.init(sequelize),
  ProductMedia: ProductMedia.init(sequelize),
  Order: Order.init(sequelize),
  OrderItem: OrderItem.init(sequelize),
  Escrow: Escrow.init(sequelize),
  WalletTransaction: WalletTransaction.init(sequelize),
  GradingRequest: GradingRequest.init(sequelize),
  Address: AddressInit(sequelize),
};

// Tambahkan baris ini sebelum Object.values
const db = {
  ...models,
  sequelize, // Masukkan instance koneksi ke sini
  Sequelize
};

// Eksekusi fungsi associate() menggunakan objek db yang baru
Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});


export { sequelize, Sequelize };
export default db;