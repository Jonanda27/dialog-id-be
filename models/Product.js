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
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            artist: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            release_year: {
                type: DataTypes.INTEGER,
            },
            label: {
                type: DataTypes.STRING,
            },
            matrix_number: {
                type: DataTypes.STRING,
            },
            format: {
                type: DataTypes.ENUM('Vinyl', 'Cassette', 'CD', 'Gear'),
                allowNull: false,
            },
            grading: {
                type: DataTypes.ENUM('Mint', 'NM', 'VG+', 'VG', 'Good', 'Fair'),
                allowNull: false,
            },
            condition_notes: {
                type: DataTypes.TEXT,
            },
            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            stock: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false,
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
    }
}