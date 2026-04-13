import { Model, DataTypes } from 'sequelize';

export default class Product extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            store_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            sub_category_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            stock: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false,
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isObject(value) {
                        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                            throw new Error('Metadata harus berupa format JSON Object yang valid');
                        }
                    }
                }
            }
        }, {
            sequelize,
            tableName: 'products',
            modelName: 'Product',
            underscored: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
        this.hasMany(models.ProductMedia, { foreignKey: 'product_id', as: 'media' });

        if (models.SubCategory) {
            this.belongsTo(models.SubCategory, { foreignKey: 'sub_category_id', as: 'subCategory' });
        }

        // --- RELASI BARU ---
        // Satu produk bisa memiliki banyak ulasan dari pembeli berbeda
        if (models.Review) {
            this.hasMany(models.Review, { foreignKey: 'product_id', as: 'reviews' });
        }
    }
}