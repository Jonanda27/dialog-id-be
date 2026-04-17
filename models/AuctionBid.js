import { Model, DataTypes } from 'sequelize';

export default class AuctionBid extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            auction_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            bid_amount: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('VALID', 'INVALID', 'WINNER', 'RUNNER_UP'),
                defaultValue: 'VALID',
                allowNull: false,
            },
            ip_address: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'AuctionBid',
            tableName: 'auction_bids',
            underscored: true,
            timestamps: true,
            updatedAt: false, // Hanya butuh created_at
        });
    }

    static associate(models) {
        this.belongsTo(models.Auction, { foreignKey: 'auction_id', as: 'auction', onDelete: 'CASCADE' });
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'bidder' });
    }
}