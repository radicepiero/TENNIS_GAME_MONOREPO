module.exports = function (sequelize, DataTypes) {
  const RoomTournament = sequelize.define(
    "RoomTournament",
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
      tournament_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "tournaments",
          key: "id",
        },
      },
    },
    {
      sequelize,
      tableName: "room_tournaments",
      schema: "public",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      freezeTableName: true,
      indexes: [
        {
          name: "room_tournaments_unique",
          unique: true,
          fields: [{ name: "room_id" }, { name: "tournament_id" }],
        },
      ],
    }
  );

  RoomTournament.associate = (models) => {
    RoomTournament.belongsTo(models.Room, {
      foreignKey: "room_id",
      targetKey: "id",
    });

    RoomTournament.belongsTo(models.Tournament, {
      foreignKey: "tournament_id",
      targetKey: "id",
    });
  };

  return RoomTournament;
};
