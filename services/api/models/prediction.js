module.exports = function (sequelize, DataTypes) {
  const Prediction = sequelize.define(
    "Prediction",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      user_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "uuid",
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
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "rooms",
          key: "id",
        },
      },
      img: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "predictions",
      schema: "public",
      timestamps: true,
      freezeTableName: true,
      indexes: [
        {
          name: "id",
          fields: [{ name: "id" }],
        },
        {
          name: "unique_user_tournament",
          unique: true,
          fields: [{ name: "user_uuid" }, { name: "tournament_id" }, { name: "room_id" }],
        },
      ],
    }
  );

  Prediction.associate = (models) => {
    Prediction.hasMany(models.PredictionRow, {
      foreignKey: "prediction_id",
      as: "prediction_id",
    });
    Prediction.belongsTo(models.Tournament, {
      foreignKey: "tournament_id",
      sourceKey: "id",
    });
    Prediction.belongsTo(models.User, {
      foreignKey: "user_uuid",
      sourceKey: "uuid",
    });
  };

  return Prediction;
};

/*
const prediction = new Prediction('2', '4',  [
    { player_id: 2,  prediction: 'semifinalist' }, 
    { player_id: 3,  prediction: 'winner' }, 
    { player_id: 5,  prediction: 'semifinalist' }, 
    { player_id: 1,  prediction: 'semifinalist' }
]);

console.log(prediction);
*/
