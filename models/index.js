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
import Review from './Review.js';
import ReviewMedia from './ReviewMedia.js';
import Billing from './Billing.js';
import Auction from './Auction.js';
import AuctionBid from './AuctionBid.js';

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
  Billing: Billing.init(sequelize),
  Order: Order.init(sequelize),
  OrderItem: OrderItem.init(sequelize),
  Escrow: Escrow.init(sequelize),
  WalletTransaction: WalletTransaction.init(sequelize),
  GradingRequest: GradingRequest.init(sequelize),
  Address: AddressInit(sequelize),
  Review: Review.init(sequelize),
  ReviewMedia: ReviewMedia.init(sequelize),
  Auction: Auction.init(sequelize), 
  AuctionBid: AuctionBid.init(sequelize), 
};



// ⚡ PERBAIKAN: Gabungkan instance sequelize ke dalam object db 
// agar bisa dipanggil sebagai db.sequelize di Service
const db = {
  ...models,
  sequelize,
  Sequelize,
};

// Eksekusi fungsi associate() jika ada di dalam model
// Di sinilah relasi Category -> SubCategory -> Product dirangkai
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});


// Export secara named untuk kebutuhan spesifik
export { sequelize, Sequelize };
export default db;