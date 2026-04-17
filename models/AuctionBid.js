'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AuctionBid extends Model {
        static associate(models) {
            // Bid ini milik lelang yang mana
            AuctionBid.belongsTo(models.Auction, {
                foreignKey: 'auction_id',
                as: 'auction',
                onDelete: 'CASCADE',
            });

            // Siapa user yang melakukan bid
            AuctionBid.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'bidder',
            });
        }
    }

    AuctionBid.init(
        {
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
                validate: {
                    min: 0,
                },
            },
            // Membedakan mana bid yang valid, dan mana bid yang di-record tapi invalid (misal: masuk saat masa freeze)
            status: {
                type: DataTypes.ENUM('VALID', 'INVALID', 'WINNER', 'RUNNER_UP'),
                defaultValue: 'VALID',
                allowNull: false,
            },
            // Ip Address atau User Agent bisa ditambahkan di sini jika Anda butuh tracking anti-spam yang lebih detail
            ip_address: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'AuctionBid',
            tableName: 'auction_bids',
            underscored: true,
            timestamps: true,
            // Mengingat ini adalah Audit Log, kita bisa mematikan fitur update untuk memastikan immutability di level aplikasi jika diperlukan.
            // Namun secara default timestamps akan membuat kolom created_at dan updated_at.
            updatedAt: false, // Kita hanya butuh kapan bid ini dibuat (created_at). Bid tidak boleh di-edit.
        }
    );

    // Hook untuk memastikan data bid bersifat Immutable sebelum disimpan
    AuctionBid.beforeUpdate((bid, options) => {
        // Flag WINNER atau RUNNER_UP boleh diupdate oleh FastAPI worker nantinya.
        // Tetapi nominal bid dan user_id tidak boleh diubah.
        if (bid.changed('bid_amount') || bid.changed('user_id')) {
            throw new Error('Data historis bid tidak boleh dimodifikasi (Immutable).');
        }
    });

    return AuctionBid;
};