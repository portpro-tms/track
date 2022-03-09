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
const token = require('./its_carrier.json');
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
  carrier
}) => {
    let finalData = {
    container: {},
    };

    try {
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
                refNums: containerNo
            })
         })
        if (response.status === 200) {
            const $ = cheerio.load(response.data);

            let table = $("#formAvailabilityBody > div.table-responsive > table")
                .map(function () {
                  return $(this)
                    .find("td")
                    .map(function () {
                      return $(this).text().trim();
                    })
                    .get();
                })
                .get();
            
            
            if (table.length < 1) {
            finalData.container.caution = true;
            finalData.container.message = error.noDataError;
            return getResponseValues(finalData.container);
            }
            let status = table[6].toLowerCase();
            let custom = table[table.indexOf("Customs") + 1].toLowerCase();
            let freight = table[table.indexOf("Freight") + 1].toLowerCase();
            let brokerHoldInfo = table[table.indexOf("PierPass") + 1].toLowerCase();
            let lastFreeDay = table[7];
            if (
            status &&
            status.indexOf("available") > -1 &&
            status &&
            status.indexOf("not") == -1
            ) {
            finalData.container.status = "available";
            }
            if (status && status.indexOf("not") > -1) {
            finalData.container.status = "not_available";
            }
            if (custom && custom.indexOf("ok") > -1) {
            finalData.container.custom = "RELEASED";
            }
            if (custom && custom.indexOf("hold") > -1) {
            finalData.container.custom = "HOLD";
            }
            if (freight && freight.indexOf("ok") > -1) {
            finalData.container.freight = "RELEASED";
            }
            if (freight && freight.indexOf("hold") > -1) {
            finalData.container.freight = "HOLD";
            }
            if (freight && freight.indexOf("hold") > -1) {
            finalData.container.freight = "HOLD";
            }
            if (brokerHoldInfo && brokerHoldInfo.indexOf("tmf hold") > -1) {
            finalData.container.brokerHold = true;
            }
            if (brokerHoldInfo && brokerHoldInfo.indexOf("ok") > -1) {
            finalData.container.brokerHold = false;
            }
            if (lastFreeDay) {
            let dat = moment.tz(lastFreeDay, timeZone);
            dat.add(moment(lastFreeDay).tz(timeZone).utcOffset() * -1, "minutes");
            finalData.container.last_free_day = dat.toISOString();
            }
            if (Object.keys(finalData.container).length <= 1) {
            finalData.container.caution = true;
            finalData.container.message = error.noDataError;
            return getResponseValues(finalData.container);
            }
            finalData.container.caution = false;
            return getResponseValues(finalData.container);         
        }
    } catch (e) {
        logger.error(`L4JS ${port} ${containerNo} ${e}`)
        finalData.container.caution = true;
        finalData.container.message = error.failedScrapeError;
        return getResponseValues(finalData.container);
    }
};

module.exports = its;
