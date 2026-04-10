import { Model, DataTypes } from 'sequelize';

export default class OrderItem extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            order_id: { type: DataTypes.UUID, allowNull: false },
            product_id: { type: DataTypes.UUID, allowNull: false },
            qty: { type: DataTypes.INTEGER, defaultValue: 1 },
            price_at_purchase: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            grading_at_purchase: { type: DataTypes.STRING, allowNull: false }
        }, { sequelize, tableName: 'order_items', modelName: 'OrderItem', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });

        // --- RELASI BARU & KRUSIAL ---
        // hasOne: Memastikan di level ORM bahwa 1 OrderItem eksklusif hanya untuk 1 Review
        if (models.Review) {
            this.hasOne(models.Review, { foreignKey: 'order_item_id', as: 'review' });
        }
    }
}