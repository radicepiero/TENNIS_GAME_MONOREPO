module.exports = function (sequelize, DataTypes) {
  const RoomMember = sequelize.define(
    "RoomMember",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "rooms",
          key: "id",
        },
      },
      user_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "uuid",
        },
      },
      role: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "member",
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "accepted",
      },
      invited_by_user_uuid: {
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
      tableName: "room_members",
      schema: "public",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      freezeTableName: true,
      indexes: [
        {
          name: "room_members_unique",
          unique: true,
          fields: [{ name: "room_id" }, { name: "user_uuid" }],
        },
      ],
    }
  );

  RoomMember.associate = (models) => {
    RoomMember.belongsTo(models.Room, {
      foreignKey: "room_id",
      targetKey: "id",
    });

    RoomMember.belongsTo(models.User, {
      foreignKey: "user_uuid",
      targetKey: "uuid",
      as: "user",
    });

    RoomMember.belongsTo(models.User, {
      foreignKey: "invited_by_user_uuid",
      targetKey: "uuid",
      as: "inviter",
    });
  };

  return RoomMember;
};
