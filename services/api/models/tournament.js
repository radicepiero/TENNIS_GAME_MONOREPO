const { DataTypes } = require("sequelize");
module.exports = function (sequelize) {
  const Tournament = sequelize.define(
    "Tournament",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      href: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: { type: DataTypes.STRING(255), allowNull: true },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      surface: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      prizemoney: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.ENUM("$", "€"),
        allowNull: false,
        defaultValue: "€", // Imposta l'euro come valuta predefinita
      },
      datainizio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      datafine: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("completed", "upcoming", "in-progress"),
        allowNull: false,
      },
      ranking_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      rounds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      costopartecipazione: {//SEMPRE IN EURO
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 5,
      },
    },
    {
      sequelize,
      tableName: "tournaments",
      schema: "public",
      timestamps: false,
      indexes: [
        {
          name: "tournaments_pkey",
          unique: true,
          fields: [{ name: "id" }], // Chiave primaria su id
        },
        {
          name: "unique_name_year", // Nome dell'indice univoco
          unique: true,
          fields: [
            { name: "name" }, // Campo name
            sequelize.literal("EXTRACT(YEAR FROM datafine)"), // Anno estratto da datafine
          ],
        },
      ],
    }
  );
  Tournament.associate = (models) => {
    Tournament.hasMany(models.Prediction, {
      foreignKey: "tournament_id",
      sourceKey: "id",
    });
    Tournament.belongsToMany(models.Script, {
      through: "TournamentScript",
      foreignKey: "tournament_id",
    });
  };
  return Tournament;
};
