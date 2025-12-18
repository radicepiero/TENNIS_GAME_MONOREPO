// services/UserApiClient.js
// classe tutta da controllare: generata a caso da openai
const axios = require("axios");

class UserApiClient {
  constructor(baseURL) {
    this.api = axios.create({
      baseURL,
      timeout: 5000,
    });
  }

  async register({ email, password, soprannome, image_url = null }) {
    try {
      const response = await this.api.post("/users/register", {
        email,
        password,
        soprannome,
        image_url,
        level,
      });
      return response.data;
    } catch (err) {
      throw new Error(
        `Registration failed: ${err.response?.data?.message || err.message}`
      );
    }
  }

  async login({ email, password }) {
    try {
      const response = await this.api.post("/users/login", {
        email,
        password,
      });
      return response.data; // es. token, user info
    } catch (err) {
      throw new Error(
        `Login failed: ${err.response?.data?.message || err.message}`
      );
    }
  }

  async getUser(uuid, token) {
    try {
      const response = await this.api.get(`/users/${uuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      throw new Error(
        `Get user failed: ${err.response?.data?.message || err.message}`
      );
    }
  }

  async getAllUsers(token) {
    try {
      const response = await this.api.get("/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      throw new Error(
        `Get all users failed: ${err.response?.data?.message || err.message}`
      );
    }
  }
}

module.exports = UserApiClient;
