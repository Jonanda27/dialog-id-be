import { Model, DataTypes } from 'sequelize';

export default class OrderItem extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            order_id: { type: DataTypes.UUID, allowNull: false },
            product_id: { type: DataTypes.UUID, allowNull: false },
            qty: { type: DataTypes.INTEGER, defaultValue: 1 },
            price_at_purchase: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            grading_at_purchase: { type: DataTypes.STRING, allowNull: false },

            // --- INJEKSI FITUR GRADING ADD-ON ---
            grading_fee: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Menyimpan biaya tiket grading jika pembeli memvalidasi produk ini'
            }
        }, { sequelize, tableName: 'order_items', modelName: 'OrderItem', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    }
}