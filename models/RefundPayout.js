import { Model, DataTypes } from 'sequelize';

export default class RefundPayout extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            dispute_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            order_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            buyer_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            amount: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                get() {
                    const value = this.getDataValue('amount');
                    return value ? parseFloat(value) : 0;
                }
            },
            status: {
                type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
                defaultValue: 'pending'
            },
            payout_method: {
                type: DataTypes.STRING,
                allowNull: false
            },
            external_payout_id: {
                type: DataTypes.STRING,
                unique: true
            },
            retry_count: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            error_log: {
                type: DataTypes.TEXT
            }
        }, {
            sequelize,
            tableName: 'refund_payouts',
            modelName: 'RefundPayout',
            underscored: true,
            timestamps: true
        });
    }

    static associate(models) {
        this.belongsTo(models.Dispute, { foreignKey: 'dispute_id', as: 'dispute' });
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
        this.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
    }
}