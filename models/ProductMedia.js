import { Model, DataTypes } from 'sequelize';

export default class ProductMedia extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            product_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            media_url: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            is_primary: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            }
        }, {
            sequelize,
            tableName: 'product_media',
            modelName: 'ProductMedia',
            underscored: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    }
}