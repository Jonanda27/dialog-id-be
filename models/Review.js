// File: dialog-id-be/models/Review.js
import { Model, DataTypes } from 'sequelize';

export default class Review extends Model {
    static init(sequelize) {
        return super.init({
            id: { 
                type: DataTypes.UUID, 
                defaultValue: DataTypes.UUIDV4, 
                primaryKey: true 
            },
            buyer_id: { 
                type: DataTypes.UUID, 
                allowNull: false 
            },
            store_id: { 
                type: DataTypes.UUID, 
                allowNull: false 
            },
            product_id: { 
                type: DataTypes.UUID, 
                allowNull: false 
            },
            order_item_id: { 
                type: DataTypes.UUID, 
                allowNull: false,
                unique: true 
            },
            rating: { 
                type: DataTypes.INTEGER, 
                allowNull: false,
                validate: {
                    min: 1,
                    max: 5
                }
            },
            comment: { 
                type: DataTypes.TEXT, 
                allowNull: true 
            },
            seller_reply: { 
                type: DataTypes.TEXT, 
                allowNull: true 
            }
        }, { 
            sequelize, 
            tableName: 'reviews', 
            modelName: 'Review', 
            underscored: true 
        });
    }

    static associate(models) {
        this.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
        this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
        this.belongsTo(models.OrderItem, { foreignKey: 'order_item_id', as: 'orderItem' });
        this.hasMany(models.ReviewMedia, { foreignKey: 'review_id', as: 'media' });
    }
}