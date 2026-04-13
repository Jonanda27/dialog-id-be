import { Model, DataTypes } from 'sequelize';

class SubCategory extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
        // Belongs-To: Sub-Kategori ini milik satu Kategori Induk
        this.belongsTo(models.Category, {
            foreignKey: 'category_id',
            as: 'category'
        });

        // One-to-Many: Satu Sub-Kategori memiliki banyak Produk
        this.hasMany(models.Product, {
            foreignKey: 'sub_category_id',
            as: 'products',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    }

    /**
     * Initialization method called by models/index.js
     */
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            category_id: {
                type: DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "ID Kategori Induk wajib diisi" }
                }
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Nama sub-kategori tidak boleh kosong" }
                }
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            }
        }, {
            sequelize,
            modelName: 'SubCategory',
            tableName: 'sub_categories',
            underscored: true,
            timestamps: true
        });
    }
}

export default SubCategory;