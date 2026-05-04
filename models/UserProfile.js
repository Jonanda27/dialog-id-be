import { Model, DataTypes } from 'sequelize';

export default class UserProfile extends Model {
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
            username: {
                type: DataTypes.STRING,
                unique: {
                    msg: 'Username sudah digunakan.'
                }
            },
            phone_number: {
                type: DataTypes.STRING,
                validate: {
                    is: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g
                }
            },
            gender: {
                type: DataTypes.ENUM('Laki-laki', 'Perempuan'),
            },
            birth_date: {
                type: DataTypes.DATEONLY,
            },
            profile_picture_url: {
                type: DataTypes.STRING,
            }
        }, {
            sequelize,
            modelName: 'UserProfile',
            tableName: 'user_profiles',
            underscored: true,
            timestamps: true,
        });
    }

    static associate(models) {
        // Relasi Balik: Profile ini milik seorang User
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
}