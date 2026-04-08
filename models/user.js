import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

export default class User extends Model {
  static init(sequelize) {
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
        validate: {
          isEmail: true,
        }
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
      underscored: true, // Mengubah camelCase di JS menjadi snake_case di DB (created_at)
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
    // Relasi One-to-One
    this.hasOne(models.Store, {
      foreignKey: 'user_id',
      as: 'store'
    });
  }

  /**
   * Helper method untuk membandingkan password saat login
   * @param {string} candidatePassword - Password plain text dari request
   * @returns {Promise<boolean>}
   */
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}