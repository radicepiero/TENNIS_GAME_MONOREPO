const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
module.exports = function (sequelize) {
  const User = sequelize.define(
    "User",
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // genera automaticamente UUID
        allowNull: false,
        primaryKey: true,
      },
      soprannome: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: false,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        set(value) {
          //dobbiamo validare il valore immesso dall'utente in questa fase,  utilizzando una regex in validate andremmo a validare il risultato di bcrypt e non il valore immesso dall'utente

          const check =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

          if (!check.test(value)) {
            throw new Error("Validation is on password failed");
          }
          this.setDataValue(
            "password",
            bcrypt.hashSync(value, bcrypt.genSaltSync())
          );
          //per recuperare la password invece occorre decriptarla per poterla confrontare con il valore immesso da parte dell'utente
        },
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      level: {
        type: DataTypes.ENUM("super", "admin", "friend"),
        allowNull: false,
        defaultValue: "friend",
      },
    },
    {
      sequelize,
      tableName: "users",
      schema: "public",
      freezeTableName: true,
      timestamps: true,
      defaultScope: {
        attributes: { exclude: ["password", "active"] }, // <--- Esclude "password" da tutte le query di default
      },
      scopes: {
        withPassword: {
          attributes: { include: ["password", "active"] }, // <--- Usalo solo quando serve anche la password
        },
      },
      indexes: [
        {
          name: "user_email",
          unique: true,
          fields: [{ name: "email" }],
        },
        {
          name: "user_pkey",
          unique: true,
          fields: [{ name: "uuid" }],
        },
      ],
    }
  );
  User.associate = (models) => {
    User.hasMany(models.Prediction, {
      foreignKey: "user_uuid",
      sourceKey: "uuid",
    });
  };
  return User;
};
