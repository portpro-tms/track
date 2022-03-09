const axios = require("axios").default;

const httpRequest = async (options = {}, data = {}) => {
  // pass url, headers as options and payload as data
  try {
    let resp = await axios(options, data);
    return resp;
  } catch (e) {
    return e;
  }
};

module.exports = httpRequest;
