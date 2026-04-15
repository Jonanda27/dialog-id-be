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
            // --- RELASI KATEGORI BARU ---
            sub_category_id: {
                type: DataTypes.UUID,
                allowNull: true, // Diset true sementara untuk kompatibilitas data lama
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
            // --- ATRIBUT FISIK & LOGISTIK (NEW) ---
            product_weight: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Berat aktual produk dalam Gram',
            },
            product_length: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Panjang dimensi produk dalam Cm',
            },
            product_width: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Lebar dimensi produk dalam Cm',
            },
            product_height: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Tinggi dimensi produk dalam Cm',
            },
            // --- GAME CHANGER: JSONB METADATA ---
            // Menggantikan artist, release_year, label, matrix_number, format, grading, dan condition_notes
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    // Custom validator untuk memastikan input selalu berbentuk Object {} bukan Array [] atau null
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
        // Relasi Existing
        this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
        this.hasMany(models.ProductMedia, { foreignKey: 'product_id', as: 'media' });

        // --- RELASI BARU ---
        // Produk ini bernaung di bawah satu Sub-Kategori spesifik
        if (models.SubCategory) {
            this.belongsTo(models.SubCategory, { foreignKey: 'sub_category_id', as: 'subCategory' });
        }
    }
}