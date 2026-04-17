import { Model, DataTypes } from 'sequelize';

export default class Billing extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('unpaid', 'paid', 'expired', 'cancelled'),
        defaultValue: 'unpaid'
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: true
      },
      payment_reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      snap_token: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'Billing',
      tableName: 'billings',
      underscored: true, // Menggunakan snake_case (created_at, updated_at)
    });
  }

  static associate(models) {
    // Relasi: Satu Billing bisa memiliki banyak Order (1 Billing -> Many Orders)
    this.hasMany(models.Order, {
      foreignKey: 'billing_id',
      as: 'orders'
    });

    // Relasi: Billing dimiliki oleh satu User (Buyer)
    this.belongsTo(models.User, {
      foreignKey: 'buyer_id',
      as: 'buyer'
    });
  }
}