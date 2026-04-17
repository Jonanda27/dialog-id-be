import { Model, DataTypes } from 'sequelize';

export default class Order extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            billing_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'billings', key: 'id' }
            },
            // --- MODUL LELANG (NEW) ---
            auction_id: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: 'Referential ID jika Order ini di-generate secara otomatis oleh Worker pemenang lelang',
            },
            buyer_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            store_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            subtotal: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false
            },
            shipping_fee: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false
            },
            grading_fee: {
                type: DataTypes.DECIMAL(12, 2),
                defaultValue: 0
            },
            grand_total: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM(
                    'pending_payment', 'paid', 'processing',
                    'shipped', 'delivered', 'completed',
                    'cancelled', 'disputed'
                ),
                defaultValue: 'pending_payment'
            },
            shipping_address: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            tracking_number: {
                type: DataTypes.STRING
            },
            payment_method: {
                type: DataTypes.STRING
            },
            payment_reference: {
                type: DataTypes.STRING
            }
        }, {
            sequelize,
            tableName: 'orders',
            modelName: 'Order',
            underscored: true
        });
    }

    static associate(models) {
        this.belongsTo(models.Billing, {
            foreignKey: 'billing_id',
            as: 'billing'
        });

        this.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
        this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
        this.hasMany(models.OrderItem, { foreignKey: 'order_id', as: 'items' });
        this.hasOne(models.Escrow, { foreignKey: 'order_id', as: 'escrow' });

        // Relasi referensial opsional untuk memanggil data detail lelang dari Object Order
        if (models.Auction) {
            this.belongsTo(models.Auction, { foreignKey: 'auction_id', as: 'auction_details' });
        }
    }
}