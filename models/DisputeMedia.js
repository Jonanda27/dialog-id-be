'use strict';

export default (sequelize, DataTypes) => {
    const DisputeMedia = sequelize.define('DisputeMedia', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        dispute_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        uploader_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        media_url: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'dispute_media',
        underscored: true,
        timestamps: true
    });

    DisputeMedia.associate = (models) => {
        // Relasi balik ke Dispute
        DisputeMedia.belongsTo(models.Dispute, { foreignKey: 'dispute_id', as: 'dispute' });
        // Relasi ke pengunggah (User)
        DisputeMedia.belongsTo(models.User, { foreignKey: 'uploader_id', as: 'uploader' });
    };

    return DisputeMedia;
};