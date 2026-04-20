import { Model, DataTypes } from 'sequelize';

export default class AuctionMedia extends Model {
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
                references: {
                    model: 'auctions',
                    key: 'id',
                },
            },
            media_url: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            is_primary: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: 'AuctionMedia',
            tableName: 'auction_media',
            underscored: true,
            timestamps: true,
        });
    }

    static associate(models) {
        // Relasi balik ke induk lelang
        this.belongsTo(models.Auction, {
            foreignKey: 'auction_id',
            as: 'auction',
            onDelete: 'CASCADE'
        });
    }
}