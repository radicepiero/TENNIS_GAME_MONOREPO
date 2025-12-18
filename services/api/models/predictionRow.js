//const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  const PredictionRow = sequelize.define(
    "PredictionRow",
    {
      prediction_id: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: "predictions",
          key: "id",
        },
      },
      player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "players",
          key: "id",
        },
      },
      prediction: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "predictions_rows",
      schema: "public",
      timestamps: true,
      indexes: [
        {
          name: "unique_prediction_rows",
          unique: true,
          fields: [{ name: "prediction_id" }, { name: "player_id" }],
        },
      ],
    }
  );
  PredictionRow.associate = (models) => {
    PredictionRow.belongsTo(models.Prediction, {
      foreignKey: "prediction_id",
      targetKey: "id",
    });
  };


  return PredictionRow;
};
