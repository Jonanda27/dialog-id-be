'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Category extends Model {
        /**
         * Helper method untuk mendefinisikan asosiasi.
         * Metode ini otomatis dipanggil oleh models/index.js
         */
        static associate(models) {
            // One-to-Many: Satu Kategori memiliki banyak Sub-Kategori
            Category.hasMany(models.SubCategory, {
                foreignKey: 'category_id',
                as: 'subCategories', // Alias pemanggilan (contoh: category.subCategories)
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            });
        }
    }

    Category.init({
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
        underscored: true, // Otomatis mengubah camelCase ke snake_case (createdAt -> created_at)
        timestamps: true
    });

    return Category;
};