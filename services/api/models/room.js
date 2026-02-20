module.exports = function (sequelize, DataTypes) {
  const Room = sequelize.define(
    "Room",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      short_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      long_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by_user_uuid: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "uuid",
        },
      },
    },
    {
      sequelize,
      tableName: "rooms",
      schema: "public",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      freezeTableName: true,
      indexes: [
        {
          name: "rooms_name_unique",
          unique: true,
          fields: [{ name: "name" }],
        },
      ],
    }
  );

  Room.associate = (models) => {
    Room.belongsTo(models.User, {
      foreignKey: "created_by_user_uuid",
      targetKey: "uuid",
      as: "creator",
    });

    Room.hasMany(models.RoomMember, {
      foreignKey: "room_id",
      sourceKey: "id",
      as: "members",
    });

    Room.hasMany(models.RoomTournament, {
      foreignKey: "room_id",
      sourceKey: "id",
      as: "tournaments",
    });

    Room.hasMany(models.Prediction, {
      foreignKey: "room_id",
      sourceKey: "id",
      as: "predictions",
    });
  };

  return Room;
};
