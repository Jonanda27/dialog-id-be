'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Auction extends Model {
        /**
         * Helper method untuk mendefinisikan relasi antar model.
         * Metode ini dipanggil otomatis oleh file models/index.js.
         */
        static associate(models) {
            // Lelang terikat pada satu produk spesifik
            Auction.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE',
            });

            // Satu lelang memiliki banyak histori bid (One-to-Many)
            Auction.hasMany(models.AuctionBid, {
                foreignKey: 'auction_id',
                as: 'bids',
            });

            // Relasi opsional: Menyimpan siapa pemenang akhirnya untuk kemudahan query
            Auction.belongsTo(models.User, {
                foreignKey: 'winner_id',
                as: 'winner',
            });
        }
    }

    Auction.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            product_id: {
                type: DataTypes.UUID, // Sesuaikan dengan tipe id di tabel Product Anda
                allowNull: false,
            },
            winner_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            start_time: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: true,
                },
            },
            end_time: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: true,
                    isAfterStartTime(value) {
                        if (value <= this.start_time) {
                            throw new Error('end_time harus lebih besar dari start_time');
                        }
                    },
                },
            },
            increment: {
                type: DataTypes.DECIMAL(15, 2), // Menggunakan Decimal untuk nominal uang
                allowNull: false,
                validate: {
                    min: 0,
                },
            },
            current_price: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: 0,
                },
            },
            status: {
                type: DataTypes.ENUM(
                    'DRAFT',
                    'SCHEDULED',
                    'ACTIVE',
                    'FREEZE',
                    'EVALUATION',
                    'COMPLETED',
                    'HANDOVER_TO_RUNNER_UP',
                    'FAILED'
                ),
                defaultValue: 'DRAFT',
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'Auction',
            tableName: 'auctions',
            underscored: true, // Mengubah camelCase menjadi snake_case di level database (created_at, updated_at)
            timestamps: true,
        }
    );

    return Auction;
};