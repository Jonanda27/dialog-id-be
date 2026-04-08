import { Model, DataTypes } from 'sequelize';

export default class GradingRequest extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            buyer_id: { type: DataTypes.UUID, allowNull: false },
            product_id: { type: DataTypes.UUID, allowNull: false },
            status: { type: DataTypes.ENUM('requested', 'fulfilled', 'cancelled'), defaultValue: 'requested' }
        }, { sequelize, tableName: 'grading_requests', modelName: 'GradingRequest', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    }
}