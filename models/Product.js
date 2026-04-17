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
            // --- MODUL LELANG (NEW) ---
            is_locked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'Indikator untuk mengunci produk dari transaksi checkout reguler saat lelang sedang berlangsung',
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
        this.hasMany(models.Review, { foreignKey: 'product_id', as: 'reviews' });

        if (models.SubCategory) {
            this.belongsTo(models.SubCategory, { foreignKey: 'sub_category_id', as: 'subCategory' });
        }

        // Relasi Modul Lelang (Satu produk bisa memiliki satu lelang aktif/terjadwal)
        if (models.Auction) {
            this.hasOne(models.Auction, { foreignKey: 'product_id', as: 'auction' });
        }
    }
}