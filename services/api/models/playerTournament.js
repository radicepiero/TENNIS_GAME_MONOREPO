//const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  const PlayerTournament = sequelize.define(
    "PlayerTournament",
    {
      player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "players",
          key: "id",
        },
      },
      tournament_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "tournaments",
          key: "id",
        },
      },
      turno: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "players_tournaments",
      schema: "public",
      timestamps: false,
      indexes: [
        {
          name: "player_tournament_pkey",
          unique: true,
          fields: [{ name: "player_id" }, { name: "tournament_id" }],
        },
      ],
    }
  );

  PlayerTournament.associate = (models) => {
    PlayerTournament.belongsTo(models.Player, {
      foreignKey: "player_id",
      targetKey: "id",
    });
  };

  return PlayerTournament;
};
