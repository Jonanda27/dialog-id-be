import { Model, DataTypes } from 'sequelize';

export default class GradingRequest extends Model {
    static init(sequelize) {
        return super.init({
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            buyer_id: { type: DataTypes.UUID, allowNull: false },
            product_id: { type: DataTypes.UUID, allowNull: false },
            order_id: { type: DataTypes.UUID, allowNull: true },

            // --- PEMBARUAN STATE MACHINE GRADING ---
            status: {
                type: DataTypes.ENUM(
                    // Legacy states (Dipertahankan untuk backward compatibility)
                    'requested',
                    'fulfilled',
                    'cancelled',

                    // New System states (Sesuai Blueprint Bisnis)
                    'AWAITING_SELLER_MEDIA',  // Fase 1: Menunggu penjual upload video
                    'MEDIA_READY',            // Fase 2: Video siap, menunggu pembeli checkout
                    'EXPIRED',                // Fase 3: Hangus karena tidak di-checkout dalam 3x24 jam
                    'SYSTEM_CANCELLED'        // Fase 3: Batal otomatis karena barang dibeli orang lain
                ),
                defaultValue: 'AWAITING_SELLER_MEDIA'
            }
        }, { sequelize, tableName: 'grading_requests', modelName: 'GradingRequest', underscored: true });
    }

    static associate(models) {
        this.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
    }
}