const { DataTypes } = require("sequelize");
module.exports = function (sequelize) {
  const Script = sequelize.define(
    "Script",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      script: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "scripts",
      schema: "public",
    }
  );
  Script.associate = (models) => {
    Script.belongsToMany(models.Tournament, {
      through: "TournamentScript",
      foreignKey: "scriptName",
    });
  };
  return Script;
};
