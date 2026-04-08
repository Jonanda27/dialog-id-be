import { Model, DataTypes } from 'sequelize';

export default class WalletTransaction extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            store_id: { type: DataTypes.UUID, allowNull: false },
            type: { type: DataTypes.ENUM('CREDIT', 'DEBIT'), allowNull: false },
            amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
            source: { type: DataTypes.STRING, allowNull: false },
            reference_id: { type: DataTypes.UUID }
        }, { sequelize, tableName: 'wallet_transactions', modelName: 'WalletTransaction', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
    }
}