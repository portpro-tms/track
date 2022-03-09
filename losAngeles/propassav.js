let vigTokens = require("./vig.json");
const error = require("../common/errorMessage.json");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const moment = require("moment");
const getResponseValues = require("../common/getResponseValues");
const httpRequest = require("../common/httpRequest");
require("moment-timezone");

let statusOptions = {
  "IN YARD": "available",
  "READY FOR PICKUP": "available",
};

const propassva = async ({ port, containerNo, carrier, timeZone }) => {
  let token = undefined;
  let finalData = {
    container: {},
  };

  if (carrier == "5fb3e0fc2a51862c03449322") {
    token = vigTokens.tmx;
  }
  if (carrier == "6037c1fdf7cac21641d01ac4") {
    token = vigTokens.usportservies;
  }
  if (carrier == "5f58f604f7be2c07e8d727c9") {
    //username password not found for terminal site
    token = vigTokens.ntransvcs;
  }
  if (carrier == "60707d59a8da1577fd3c871e") {
    token = vigTokens.leightontrucking;
  }
  if (carrier == "60a418a657f336763cbf40a2") {
    //INVALID CREDENTAILS
    token = vigTokens.phltrucklines;
  }
  if (carrier == "60819676ae88e5182fc02995") {
    //VERIFICATION REQUIRED
    token = vigTokens.vpvtransport;
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
        Origin: "https://propassva.emodal.com",
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
    if (
      result.response &&
      result.response.status &&
      result.response.status == 401
    ) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      return getResponseValues(finalData.container);
    }

    if (result && result.data && result.data.data) {
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
    finalData.caution = true;
    finalData.message = error.failedScrapeError;
    return getResponseValues(finalData);
  }
};

module.exports = propassva;
