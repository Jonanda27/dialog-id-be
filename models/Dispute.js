'use strict';

export default (sequelize, DataTypes) => {
    const Dispute = sequelize.define('Dispute', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },
        buyer_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: false
        },
        return_tracking_number: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
           type: DataTypes.ENUM('open', 'mediation', 'returning', 'resolved'),
            allowNull: false,
            defaultValue: 'open'
        },
        admin_decision_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'disputes',
        underscored: true,
        timestamps: true
    });

    Dispute.associate = (models) => {
        // Relasi ke Order
        Dispute.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
        // Relasi ke User (Buyer)
        Dispute.belongsTo(models.User, { foreignKey: 'buyer_id', as: 'buyer' });
        // Relasi ke Store
        Dispute.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
        // Relasi ke Media
        Dispute.hasMany(models.DisputeMedia, { foreignKey: 'dispute_id', as: 'media' });
    };

    return Dispute;
};