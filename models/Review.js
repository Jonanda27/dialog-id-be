import { Model, DataTypes } from 'sequelize';

export default class Review extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            product_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            order_item_id: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true, // Mirroring constraint database ke level ORM
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: { args: [1], msg: "Rating minimal adalah 1" },
                    max: { args: [5], msg: "Rating maksimal adalah 5" },
                }
            },
            comment: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            media: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Format media ulasan harus berupa array URL');
                        }
                    }
                }
            }
        }, {
            sequelize,
            tableName: 'reviews',
            modelName: 'Review',
            underscored: true,
        });
    }

    static associate(models) {
        // Relasi Belongs-To ke User (Siapa yang mengulas)
        if (models.User) {
            this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }

        // Relasi Belongs-To ke Product (Barang apa yang diulas)
        if (models.Product) {
            this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
        }

        // Relasi Belongs-To ke OrderItem (Ini bukti transaksi sahnya)
        if (models.OrderItem) {
            this.belongsTo(models.OrderItem, { foreignKey: 'order_item_id', as: 'orderItem' });
        }
    }
}