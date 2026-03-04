const buildApiBaseUrl = (req) => {
  const apiUrl = (req && req.app && req.app.locals && req.app.locals.apiUrl) || "/api";
  return process.env.API || apiUrl;
};

const buildForwardHeaders = (req) => {
  return {
    cookie: (req && req.headers && req.headers.cookie) || "",
  };
};

const apiFetch = async (req, path, options = {}) => {
  const baseUrl = buildApiBaseUrl(req);
  const headers = {
    ...buildForwardHeaders(req),
    ...(options.headers || {}),
  };

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
};

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
};

module.exports = {
  apiFetch,
  safeJson,
};
