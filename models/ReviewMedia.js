import { Model, DataTypes } from 'sequelize';

export default class ReviewMedia extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            review_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            media_url: {
                type: DataTypes.STRING,
                allowNull: false,
            }
        }, {
            sequelize,
            tableName: 'review_media',
            modelName: 'ReviewMedia',
            underscored: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.Review, { foreignKey: 'review_id', as: 'review' });
    }
}