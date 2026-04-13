import { Model, DataTypes } from 'sequelize';

class Category extends Model {
    /**
     * Helper method untuk mendefinisikan asosiasi.
     * Metode ini otomatis dipanggil oleh models/index.js
     */
    static associate(models) {
        // One-to-Many: Satu Kategori memiliki banyak Sub-Kategori
        this.hasMany(models.SubCategory, {
            foreignKey: 'category_id',
            as: 'subCategories',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    }

    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: { msg: "Nama kategori tidak boleh kosong" }
                }
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            icon: {
                type: DataTypes.STRING,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'Category',
            tableName: 'categories',
            underscored: true,
            timestamps: true
        });
    }
}

export default Category;