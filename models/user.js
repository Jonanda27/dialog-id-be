import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

export default class User extends Model {
  static init(sequelize) {
    // Kita memanggil super.init (static method dari Sequelize Model)
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'buyer', 'seller'),
        allowNull: false,
      }
    }, {
      sequelize,
      tableName: 'users',
      modelName: 'User',
      underscored: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      }
    });
  }

  static associate(models) {
    this.hasOne(models.Store, { foreignKey: 'user_id', as: 'store' });
    this.hasMany(models.Order, { foreignKey: 'buyer_id', as: 'buyerOrders' });
    if (models.Review) {
      this.hasMany(models.Review, { foreignKey: 'user_id', as: 'reviews' });
    }
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}