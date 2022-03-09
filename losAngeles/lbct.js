const moment = require("moment");
require("moment-timezone");
const errorMessage = require("../common/errorMessage.json")
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");

const lbct = async ({ port, containerNo, timeZone }) => {
  let res = {
    container: {},
  };
  try {
    let options = {
      url: `https://www.lbct.com/CargoSearch/GetMultiCargoSearchJson?timestamp=1606123303137&listOfSearchId=${containerNo}`,
      method: "get",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
    };
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
    let response = await httpRequest(options);
    if (response.status != 200 || !response.data[0]) {
      logger.error(`L4JS ${port} ${containerNo} ${response.status}`)
      res.container.message = errorMessage.failedScrapeError;
      res.container.caution = true;
      return getResponseValues(res.container);
    }
    if (response.data && response.data.length > 0) {
      let thatData = response.data[0];
      res.container.container_no = containerNo;
      if (thatData && thatData.listOfFee) {
        let dat = moment.tz(thatData.listOfFee[0].goodThruDay, timeZone);
        dat.add(
          moment(thatData.listOfFee[0].goodThruDay).tz(timeZone).utcOffset() * -1,
          "minutes"
        );
        res.container.last_free_day = dat.toISOString();
        res.caution = false;
      }
      if (
        thatData &&
        thatData.available &&
        thatData.available.toLowerCase() == "yes"
      ) {
        res.container.status = "available";
        res.caution = false;
      }
      if (
        thatData &&
        thatData.available &&
        thatData.available.toLowerCase() == "no"
      ) {
        res.container.status = "not_available";
        res.caution = false;
      }
      if (
        thatData.vessel
      ) {
        res.container.vesselName = thatData.vessel;
        res.caution = false;
      }
      if (
        thatData.line
      ) {
        res.container.containerOwnerName = thatData.line;
        res.caution = false;
      }
      
      if (thatData && thatData.listOfFlag && thatData.listOfFlag.length > 0) {
        thatData.listOfFlag.forEach((item, i) => {
          if (item.holdName == "CUSTOMS_DEFAULT_HOLD") {
            res.container.custom = item.type;
          }
          if (
            item.holdName == "CUSTOMS_DEFAULT_HOLD" &&
            item.type.toLowerCase() == "active"
          ) {
            res.container.custom = 'HOLD';
          }
          if (
            item.holdName == "TMF_CONTAINER_HOLD" &&
            item.type.toLowerCase() == "active"
          ) {
            res.container.brokerHold = true;
          }
          if (
            item.holdName == "BLOCK_DOWN" &&
            item.type.toLowerCase() == "active"
          ) {
            res.container.status = "not_available";
            res.caution = false;
          }
          if (
            item.holdName == "FREIGHT_BL_HOLD" &&
            item.type.toLowerCase() == "active"
          ) {
            res.container.freight = "HOLD";
          } else if (
            item.holdName == "FREIGHT_BL_HOLD" &&
            item.type.toLowerCase() == "inactive"
          ) {
            res.container.freight = "RELEASED";
          } else if (item.holdName == "FREIGHT_BL_HOLD") {
            res.container.freight = item.type;
          }
        });
      }
      if (res.container.last_free_day === null || res.container.last_free_day === undefined) { 
        delete res.container.container_no;
        delete res.container.last_free_day;
      }
      
      if (Object.keys(res.container).length <= 2) {
        res.container.caution = true;
        res.container.message = errorMessage.noDataError;
        return getResponseValues(res.container);
      }
      res.container.caution = false;
      return getResponseValues(res.container);
    }
  } catch (error) {
    logger.error(`L4JS ${port} ${containerNo} ${error}`)
    res.container.caution = true;
    res.container.message = errorMessage.failedScrapeError;
    return getResponseValues(res.container);
  }

};

module.exports = lbct;
