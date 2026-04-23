import { Model, DataTypes } from 'sequelize';

export default class UserBankAccount extends Model {
  static init(sequelize) {
    return super.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      bank_name: { type: DataTypes.STRING, allowNull: false },
      bank_account_number: { type: DataTypes.STRING, allowNull: false },
      bank_account_name: { type: DataTypes.STRING, allowNull: false },
    }, {
      sequelize,
      tableName: 'user_bank_accounts',
      modelName: 'UserBankAccount',
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}