let nyctTokens = require("./nyct.json");
const error = require("../common/errorMessage.json");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const getResponseValues = require("../common/getResponseValues");
const httpRequest = require("../common/httpRequest");

let statusOptions = {
  "IN YARD": "available",
  "READY FOR PICKUP": "available",
};

const nyct = async ({ port, containerNo, carrier, timeZone }) => {
  let token = undefined;
  let finalData = {
    container: {},
  };
  
  if (carrier == "5fb3e0fc2a51862c03449322") {
    token = nyctTokens.tmx;
  }
  if (carrier == "5b7138ab0c29d2783bfb80c4") {
    token = nyctTokens.mecca;
  }
  if (carrier == "5a39472b4a819b31e9496084") {
    token = nyctTokens.loyalty;
  }
  if (carrier == "5f3ac58a0b6b9e07b1c13b86") {
    token = nyctTokens.erl;
  }
  if (carrier == "5ee790f864ca3551b0245d34") {
    token = nyctTokens.bound;
  }
  if (carrier == "5de6319016013613fab703b0") {
    token = nyctTokens.tsl;
  }
  if (carrier == "5d7f7b5ca41b235603c70bb4") {
    token = nyctTokens.kamino;
  }
  if (carrier == "604065cddf57a818cf2efe46") {
    token = nyctTokens.axela;
  }
  if (carrier == "60490d4aef17451a7da15c1a") {
    token = nyctTokens.platinum;
  }
  if (carrier == "5fb288313470e508f8e2aa95") {
    token = nyctTokens.blitz;
  }
  if (carrier == "60467e2e2d8af61a3dd538db") {
    token = nyctTokens.fed;
  }
  if (carrier == "60819676ae88e5182fc02995") {
    token = nyctTokens.vpv;
  }
  if (carrier == "6081b217cb9c377b7f83dad9") {
    token = nyctTokens.slanax;
  }
  if (carrier == "61240678dbf9d814ff75a56b") {
    token = nyctTokens.golden;
  }
  if (carrier == "609aad25366d541d4fbf8fbc") {
    token = nyctTokens.allengiantDispact;
  }
  if (carrier == "61800bb7ec81836dd3dc7104") {
    token = nyctTokens.us40Logistics;
  }
  if (carrier == "6087f72a7261670b111cae41") {
    //   SUMMA : 	SM011328
    token = nyctTokens.summa;
  }
  if (carrier == "60c1362f504e0429aa8ffe07") {
    //   SEDSUNG	Sharon20
    token = nyctTokens.shorelineexp;
  }
  if (carrier == "61114d1673c8c82681024a84") {
    //   DavcoPTP	DavcoPTP1297
    token = nyctTokens.davcotrucking;
  }

  try {
    let options = {
      url: `https://apigateway.emodal.com/datahub/drayunit`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
        "Content-Length": 185,
        Host: "apigateway.emodal.com",
        Origin: "https://porttruckpass.emodal.com",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36",
      },
      data: {
        queryContinuationToken: "",
        pageSize: 0,
        Page: 0,
        conditions: [
          {
            // required: true,
            // include: true,
            mem: "unit_nbr",
            oper: 0,
            vLow: containerNo,
            vHigh: {},
            seprator: "AND",
          },
        ],
        ordering: [],
      },
    };

    let result = await httpRequest(options);
    if (result.response && result.response.status && result.response.status == 401) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      return getResponseValues(finalData.container);
    }
    if (result  && result.data && result.data.data) {
		let filteredData = result.data.data.find(
        (D) => D.tradetype_desc === "IMPORT"
      );
      if (filteredData) {
        if (filteredData["customhold_flg"] === "True") {
          finalData.container.custom = "HOLD";
        }
        if (filteredData["customhold_flg"] === "False") {
          finalData.container.custom = "RELEASED";
        }
        if (filteredData["linehold_flg"] === "True") {
          finalData.container.freight = "HOLD";
        }
        if (filteredData["linehold_flg"] === "False") {
          finalData.container.freight = "RELEASED";
        }
        if (
          filteredData["shipmentstatus"] &&
          filteredData["shipmentstatus"].length > 0
        ) {
          if (
            filteredData["shipmentstatus"][0].holdsinfo &&
            filteredData["shipmentstatus"][0].holdsinfo.length > 0
          ) {
            let holdsInfo = filteredData["shipmentstatus"][0].holdsinfo;
            holdsInfo.forEach((element) => {
              if (element.type === "FREIGHT") {
                if (element.status === "HOLD")
                  finalData.container.freight = "HOLD";
                else if (element.status === "RELEASED")
                  finalData.container.freight = "RELEASED";
              }
              if (element.type === "CUSTOMS") {
                if (element.status === "HOLD")
                  finalData.container.custom = "HOLD";
                else if (element.status === "RELEASED")
                  finalData.container.custom = "RELEASED";
              }
            });
          }
        }

        if (
          filteredData["lfdinfo"] &&
          filteredData["lfdinfo"][0] &&
          filteredData["lfdinfo"][0]["goodthru_dt"]
        ) {
          let ldat = moment(
            filteredData["lfdinfo"][0]["goodthru_dt"],
            "YYYY-MM-DD hh:mm:ss"
          );
          let dat = moment.tz(ldat, timeZone).startOf("day");
          finalData.container.last_free_day = dat.toISOString();
        }
        if (
          finalData.container.last_free_day &&
          filteredData["hold_flg"] == "False" &&
          statusOptions[filteredData["drayunitstatus_desc"]]
        ) {
          finalData.container.status = "available";
        } else {
          finalData.container.status = "not_available";
        }
        if (filteredData["hold_flg"] == "True") {
          finalData.container.status = "not_available";
        }
        // if (filteredData['hold_flg'] == "False") {
        // 	finalData.container.status = "available";
        // }
      }
    }
    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      return getResponseValues(finalData.container);
    }
    finalData.container.caution = false;
    return getResponseValues(finalData.container);
  } catch (e) {
    logger.error(`L4JS FOR PORT ${port} and CONTAINER ${containerNo} ${e} `);
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = nyct;
