const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  const TournamentScript = sequelize.define(
    "TournamentScript",
    {
      tournament_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      scriptName: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      sequelize,
      tableName: "TournamentScript",
      schema: "public",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return TournamentScript;
};
