module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define("Match", {
    uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    treeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Trees",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    round: DataTypes.INTEGER,
    player1Id: DataTypes.INTEGER,
    player2Id: DataTypes.INTEGER,
    fatherId: DataTypes.UUID,
    p1Wins: DataTypes.BOOLEAN,
    p2Wins: DataTypes.BOOLEAN,
    date: DataTypes.DATE,
  });

  Match.associate = (models) => {
    Match.belongsTo(models.Tree, { foreignKey: "treeId", onDelete: "CASCADE" });
  };

  return Match;
};
