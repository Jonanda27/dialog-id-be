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
        return_courier: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            // ⚡ PERBAIKAN: Penambahan opsi ENUM yang tervalidasi untuk SLA Worker
            type: DataTypes.ENUM(
                'open',
                'returning',
                'arrived_at_seller',
                'mediation',
                'escalated',
                'resolved',
                'refund_failed'
            ),
            allowNull: false,
            defaultValue: 'open'
        },
        admin_decision_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // ⚡ BARU: Kolom-kolom Timestamp Absolut sebagai patokan waktu Cronjob
        accepted_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        resi_submitted_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        arrived_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        mediation_start_at: {
            type: DataTypes.DATE,
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

        // ⚡ BARU: Menautkan komplain ke antrean pencairan dana 
        // (Satu komplain hanya memiliki satu antrean transfer ke payment gateway)
        if (models.RefundPayout) {
            Dispute.hasOne(models.RefundPayout, { foreignKey: 'dispute_id', as: 'refund_payout' });
        }
    };

    return Dispute;
};