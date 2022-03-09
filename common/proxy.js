const request = require("request");

const getProxyDetails = () => {
  return new Promise((resolve, reject) => {
    request.get(
      "https://api.proxyorbit.com/v1/?token=GH5_fRZCMfjl40A_Zbe8zdyVQ9tTFXHjS2TrkCwxapQ",
      (err, Response, body) => {
        resolve(JSON.parse(body));
      }
    );
  });
};

module.exports = getProxyDetails;
