module.exports = (sequelize, DataTypes) => {
  const Tree = sequelize.define("Tree", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    tournament: DataTypes.STRING,
    ownerId: DataTypes.UUID,
    roundMax: DataTypes.INTEGER,
  });

  Tree.associate = (models) => {
    Tree.hasMany(models.Match, { foreignKey: "treeId" });
  };

  return Tree;
};
