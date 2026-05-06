import { Model, DataTypes } from 'sequelize';

export default class Wishlist extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            product_id: {
                type: DataTypes.UUID,
                allowNull: false,
            }
        }, {
            sequelize,
            tableName: 'wishlists',
            modelName: 'Wishlist',
            underscored: true,
            timestamps: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    }
}