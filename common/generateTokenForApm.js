var forge = require("node-forge");
const btoa = require('btoa');

const generateTokenForApm = function () {
  function serialize(obj) {
    var str = [];
    for (var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  var publicKey =
      "Login_Id=biks152207&User_Id=57437&PublicKey=bcc4cef2-f89d-462d-a47f-84effcda278f&PrivateKey=a6fef9b0-3992-4468-9e1a-6f0357d34565"
        .split("&")[2]
        .replace("PublicKey=", ""),
    privateKeyString =
      "Login_Id=biks152207&User_Id=57437&PublicKey=bcc4cef2-f89d-462d-a47f-84effcda278f&PrivateKey=a6fef9b0-3992-4468-9e1a-6f0357d34565"
        .split("&")[3]
        .replace("PrivateKey=", ""),
    privateKey = [],
    signature,
    timestamp = new Date().getTime(),
    urlPath = "/api/TrackAndTrace/GetContainerAvailabiltyByTerm",
    queryString = "?",
    hmac = forge.hmac.create(),
    finalBytes = [];
  for (var i = 0; i < privateKeyString.length; ++i) {
    privateKey.push(privateKeyString.charCodeAt(i));
  }
  if (queryString === "?") {
    queryString = "";
  }
  hmac.start("sha256", privateKeyString);
  hmac.update(
    urlPath.toLowerCase() +
      ":" +
      "POST" +
      ":" +
      queryString.toLowerCase() +
      ":" +
      timestamp
  );
  var sig1 = hmac.digest().getBytes();
  for (var i = 0; i < sig1.length; ++i) {
    finalBytes.push(sig1.charCodeAt(i));
  }
  var str = String.fromCharCode.apply(null, finalBytes);
  signature = btoa(str);
  let dataa =
    'TOPS-AUTH apikey="' +
    publicKey +
    '", signature="' +
    signature +
    '", utctimestamp="' +
    timestamp +
    '"';
  return dataa;
};

// const btoa = function (str) {
//   return Buffer.from(str).toString("base64");
// };

module.exports = generateTokenForApm;
