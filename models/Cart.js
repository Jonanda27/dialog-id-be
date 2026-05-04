// File: dialog-id-be/models/Cart.js
import { Model, DataTypes } from 'sequelize';

export default class Cart extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1
        }
      }
    }, {
      sequelize,
      tableName: 'carts',
      modelName: 'Cart',
      underscored: true, // Akan menghasilkan created_at dan updated_at
      timestamps: true
    });
  }

  static associate(models) {
    // Relasi: Satu item keranjang dimiliki oleh satu User
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    // Relasi: Satu item keranjang merujuk kepada satu Product
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
  }
}