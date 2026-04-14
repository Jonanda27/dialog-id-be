import { Model, DataTypes } from 'sequelize';

export default class Store extends Model {
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
                unique: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            // Gambar Toko
            logo_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            banner_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            // Jam Operasional
            working_days: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            working_hours: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            // Media Sosial (Object JSON)
            social_links: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {
                    instagram: "",
                    facebook: "",
                    youtube: "",
                    website: ""
                }
            },
            ktp_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
                defaultValue: 'pending',
                allowNull: false,
            },
            balance: {
                type: DataTypes.DECIMAL(15, 2),
                defaultValue: 0.00,
                allowNull: false,
            }
        }, {
            sequelize,
            tableName: 'stores',
            modelName: 'Store',
            underscored: true, // Ini akan mengubah social_links menjadi social_links di DB
            timestamps: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'owner'
        });
        this.hasMany(models.Product, {
            foreignKey: 'store_id', 
            as: 'products'
        });
        this.hasMany(models.Order, {
            foreignKey: 'store_id', 
            as: 'orders' 
        });
        this.hasMany(models.WalletTransaction, { 
            foreignKey: 'store_id', 
            as: 'walletTransactions' 
        });
        this.belongsTo(models.Address, { 
            foreignKey: 'origin_address_id', 
            as: 'originAddress' });
    }
}