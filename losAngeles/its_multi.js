// const puppeteer = require("puppeteer-extra");
const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
const moment = require("moment");
require("moment-timezone");
process.setMaxListeners(0);
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
const token = require("./its_carrier.json");
const { default: axios } = require("axios");
const cheerio = require("cheerio");

const formUrlEncoded = (x) =>
  Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");

const its = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
  carrier,
}) => {
  let finalData = {
    container: {},
  };
  let finalDatas = [];
  try {
    let cNumbers = containerNo.toString().split(",");

    let containerNos = [...cNumbers];
    containerNos = containerNos.filter((x) => x.match(/^[a-zA-Z]{4}[0-9]{7}$/));
    containerNos = containerNos.toString().replace(/\,/g, "\r\n");

    const todayDate = new Date().toLocaleDateString();
    const response = await axios({
      url: "https://tms.itslb.com/tms2/Import/ContainerAvailability",
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: token[carrier].cookie,
      },
      data: formUrlEncoded({
        __RequestVerificationToken: token[carrier].__RequestVerificationToken,
        refType: "CN",
        pickupDate: todayDate,
        refNums: containerNos,
      }),
    });
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      let lists = [];
      const items = $(
        "#formAvailabilityBody > div.table-responsive > table >  tr"
      ).get();

      if (items && items.length > 0) {
        items.forEach((e) => {
          let item = [];
          $(e)
            .find("td")
            .each((i, el) => {
              item.push($(el).text().trim());
            });
          lists.push(item);
        });
      }
      if (lists.length === 0) {
        let allErrors = cNumbers.map((D) => {
          let finalData = {
            container: {
              container_no: D,
              caution: true,
              message: error.noDataError,
            },
          };
          return finalData;
        });
        return allErrors;
      } else {
        cNumbers.map((D) => {
          let obj = { container: {
            container_no: D} };
          let foundIndex = lists.findIndex((ll) => ll[0] === D);
          let found = lists[foundIndex];
          let foundc = lists[foundIndex + 1];
          if (found && foundc) {
            let vals = [...found, ...foundc];
            // get Values
            let status = vals[6].toLowerCase();
            let custom = vals[vals.indexOf("Customs") + 1].toLowerCase();
            let freight = vals[vals.indexOf("Freight") + 1].toLowerCase();
            let brokerHoldInfo =
              vals[vals.indexOf("PierPass") + 1].toLowerCase();
            let lastFreeDay = vals[7];
            // Status
            if (
              status &&
              status.indexOf("available") > -1 &&
              status &&
              status.indexOf("not") == -1
            ) {
              obj.container.status = "available";
            }
            if (status && status.indexOf("not") > -1) {
              obj.container.status = "not_available";
            }

            if (custom && custom.indexOf("ok") > -1) {
              obj.container.custom = "RELEASED";
            }
            if (custom && custom.indexOf("hold") > -1) {
              obj.container.custom = "HOLD";
            }
            if (freight && freight.indexOf("ok") > -1) {
              obj.container.freight = "RELEASED";
            }
            if (freight && freight.indexOf("hold") > -1) {
              obj.container.freight = "HOLD";
            }
            if (freight && freight.indexOf("hold") > -1) {
              obj.container.freight = "HOLD";
            }
            if (brokerHoldInfo && brokerHoldInfo.indexOf("tmf hold") > -1) {
              obj.container.brokerHold = true;
            }
            if (brokerHoldInfo && brokerHoldInfo.indexOf("ok") > -1) {
              obj.container.brokerHold = false;
            }

            if (lastFreeDay) {
              let dat = moment.tz(lastFreeDay, timeZone);
              dat.add(
                moment(lastFreeDay).tz(timeZone).utcOffset() * -1,
                "minutes"
              );
              obj.container.last_free_day = dat.toISOString();
            }

            obj.container.caution = false;
          } else {
            obj = {
              container: {
                container_no: D,
                caution: true,
                message: error.noDataError,
              },
            };
          }

          finalDatas.push(obj);
        });

        return finalDatas;
      }
    }
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = its;
