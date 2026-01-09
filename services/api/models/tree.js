module.exports = (sequelize, DataTypes) => {
  const Tree = sequelize.define("Tree", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    tournament: DataTypes.STRING,
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tournaments",
        key: "id",
      },
    },
    ownerId: DataTypes.UUID,
    roundMax: DataTypes.INTEGER,
  });

  Tree.associate = (models) => {
    Tree.hasMany(models.Match, { foreignKey: "treeId" });
    Tree.belongsTo(models.Tournament, { foreignKey: "tournament_id", targetKey: "id" });
  };

  return Tree;
};
