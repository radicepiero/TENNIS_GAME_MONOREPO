// services/User.js
// classe tutta da controllare: generata a caso da openai

export default class User {
  constructor({
    uuid = null,
    id = null,
    email = "",
    soprannome = "",
    image_url = "",
    level = null,
    created_at = null,
    updated_at = null,
  } = {}) {
    this.uuid = uuid;
    this.id = id;
    this.email = email;
    this.soprannome = soprannome;
    this.image_url = image_url;
    this.level = level;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  static fromJSON(json) {
    const j = json || {};
    return new User({
      uuid: j.uuid ?? j.user_uuid ?? null,
      id: j.id ?? null,
      email: j.email ?? "",
      soprannome: j.soprannome ?? "",
      image_url: j.image_url ?? j.user_image_url ?? "",
      level: typeof j.level !== "undefined" ? j.level : null,
      created_at: j.created_at ?? null,
      updated_at: j.updated_at ?? null,
    });
  }

  toJSON() {
    return {
      uuid: this.uuid,
      id: this.id,
      email: this.email,
      soprannome: this.soprannome,
      image_url: this.image_url,
      level: this.level,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
