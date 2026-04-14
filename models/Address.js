import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
    class Address extends Model {
        static associate(models) {
            Address.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
            Address.hasMany(models.Store, { foreignKey: 'origin_address_id', as: 'stores' });
        }
    }

    Address.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true,
            }
        },
        recipient_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
            }
        },
        phone_number: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                notEmpty: true,
                // Validasi regex dasar untuk nomor telepon Indonesia/Internasional
                is: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g
            }
        },
        address_detail: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
            }
        },
        province: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        postal_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        biteship_area_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        latitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: {
                min: -90,
                max: 90
            }
        },
        longitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: {
                min: -180,
                max: 180
            }
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        sequelize,
        modelName: 'Address',
        tableName: 'addresses',
        paranoid: true, // Mengaktifkan soft delete (deletedAt)
        timestamps: true,
    });

    return Address;
};