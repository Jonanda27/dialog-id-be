import { Model, DataTypes } from 'sequelize';

export default class Auction extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            product_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            winner_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            start_time: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            end_time: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            increment: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            current_price: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: DataTypes.ENUM(
                    'DRAFT', 'SCHEDULED', 'ACTIVE', 'FREEZE',
                    'EVALUATION', 'COMPLETED', 'HANDOVER_TO_RUNNER_UP', 'FAILED'
                ),
                defaultValue: 'DRAFT',
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: 'Auction',
            tableName: 'auctions',
            underscored: true,
            timestamps: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE' });
        this.hasMany(models.AuctionBid, { foreignKey: 'auction_id', as: 'bids' });
        this.belongsTo(models.User, { foreignKey: 'winner_id', as: 'winner' });
    }
}