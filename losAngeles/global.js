const cheerio = require("cheerio");
process.setMaxListeners(0);
// http request
const httpRequest = require("../common/httpRequest");
const globalterminalsbayonne = async ({ port, timeZone }) => {
  let options = {
    method: "get",
    url: "https://globalterminalsbayonne.com/carriers-truckers/#acceptancelist",
  };
  async function fetchHTML(url) {
    let { data } = await httpRequest(options);
    return cheerio.load(data);
  }
  const $ = await fetchHTML(options);
  let link = $("#empty-acc-btn").attr("href");
  // Print the full HTML
  return link;
};
module.exports = globalterminalsbayonne;