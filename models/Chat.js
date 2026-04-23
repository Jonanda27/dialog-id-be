// models/Chat.js
import { Model, DataTypes } from 'sequelize';

export default class Chat extends Model {
  static init(sequelize) {
    return super.init({
      id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
      },
      // Diubah menjadi allowNull: true
      message: { 
        type: DataTypes.TEXT, 
        allowNull: true 
      },
      // Field baru untuk membedakan jenis pesan
      message_type: {
        type: DataTypes.ENUM('text', 'image', 'video'),
        defaultValue: 'text',
        allowNull: false
      },
      // Field baru untuk menyimpan link Cloudinary
      file_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_read: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
      }
    }, { 
      sequelize, 
      tableName: 'chats', 
      modelName: 'Chat', 
      underscored: true,
      timestamps: true // Menggunakan created_at dan updated_at secara otomatis
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
    this.belongsTo(models.User, { foreignKey: 'receiver_id', as: 'receiver' });
    this.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
  }
}