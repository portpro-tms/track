const moment = require("moment");
const error = require("../common/errorMessage.json");
require("moment-timezone");
const cheerio = require("cheerio");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");

const formUrlEncoded = (x) =>
  Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");

const gcterminals = async (payload) => {
  let detail = {};
  const formDataa = {
    containerSelectedIndexParam: "",
    searchId: "michael",
    searchType: "container",
    searchTextArea: payload.containerNo,
    searchText: "",
    buttonClicked: "Search",
  };
  let timeZone = payload.timeZone;
  try {
    const options = {
      url: "http://payments.gcterminals.com/GlobalTerminal/globalSearch.do",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      },
      // data: formDataa,
      data: formUrlEncoded(formDataa),
    };

    let body = await httpRequest(options);
    let last_free_day = undefined;
    let caution = null;
    if (body && body.data) {
      const $ = cheerio.load(body.data);
      let lastFreeDay = undefined;
      let custom = null;
      let freight = null;
      let status = null;

      let statsTable = $("#results-div > center:nth-child(2) > table")
        .map(function () {
          return $(this)
            .find("td")
            .map(function () {
              return $(this).text();
            })
            .get();
        })
        .get();

      // Map each Value
      statsTable.forEach((item, i) => {
        if (item.toLowerCase().indexOf("last free day") != -1) {
          lastFreeDay = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("freight released") != -1) {
          freight = statsTable[i + 1];
          if (freight == "Yes") {
            detail.freight = "RELEASED";
          }
          if (freight == "No") {
            detail.freight = "HOLD";
          }
        }

        if (item.toLowerCase().indexOf("customs released") != -1) {
          custom = statsTable[i + 1];
          if (custom == "Yes") {
            detail.custom = "RELEASED";
          }
          if (custom == "No") {
            detail.custom = "HOLD";
          }
        }

        if (item.toLowerCase().indexOf("available for pickup") != -1) {
          status = statsTable[i + 1];
          if (status == "Yes") {
            detail.status = "available";
          }
          if (status == "No" || status == "no") {
            detail.status = "not_available";
          }
        }

        if (item.toLowerCase().indexOf("container #") != -1) {
          detail.container = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("line") != -1) {
          detail.carrier = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("line hold") != -1) {
          detail.carrierHold = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("remarks") != -1) {
          detail.notes = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("voyage") != -1) {
          detail.voyage = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("vessel") != -1) {
          detail.voyage = statsTable[i + 1];
        }
        if (item.toLowerCase().indexOf("container type") != -1) {
          let type = statsTable[i + 1].split("-");

          detail.size = type[0];
          detail.type = type[1];
          detail.height = type[2];
        }
      });

      if (lastFreeDay && lastFreeDay != "" && lastFreeDay != "0") {
        let dat = moment.tz(lastFreeDay, timeZone);
        dat.add(moment(lastFreeDay).tz(timeZone).utcOffset() * -1, "minutes");
        detail.last_free_day = dat.toISOString();
      }

      caution = $(".not-found-text").length;
    }

    if (caution) {
      detail.caution = true;
      detail.message = error.noDataError;
    }

    if (Object.keys(detail).length <= 1) {
      detail.caution = true;
      detail.message = error.noDataError;
      return getResponseValues(detail);
    }

    return getResponseValues(detail);
  } catch (e) {
    logger.error(`L4JS ${payload.port} ${payload.containerNo} ${e}`);
    detail.caution = true;
    detail.message = error.failedScrapeError;
    return getResponseValues(detail);
  }
};

module.exports = gcterminals;
