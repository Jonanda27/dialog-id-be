import { Model, DataTypes } from 'sequelize';

export default class StoreSuspension extends Model {
  static init(sequelize) {
    return super.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      store_id: { type: DataTypes.UUID, allowNull: false },
      suspended_until: { type: DataTypes.DATE, allowNull: true },
      reason: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      sequelize,
      tableName: 'store_suspensions',
      modelName: 'StoreSuspension',
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
  }
}