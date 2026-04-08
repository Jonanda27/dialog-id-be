import { Model, DataTypes } from 'sequelize';

export default class Escrow extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            order_id: { type: DataTypes.UUID, allowNull: false, unique: true },
            amount_held: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            status: { type: DataTypes.ENUM('held', 'released', 'refunded', 'frozen'), defaultValue: 'held' }
        }, { sequelize, tableName: 'escrows', modelName: 'Escrow', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
    }
}