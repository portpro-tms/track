const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json")
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
process.setMaxListeners(0);
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
const fenixJson = require("./fenix.json");
let browser;

const fenix = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let detail = {};
  // const browser = await chromium.puppeteer.launch({
  //   args: chromium.args,
  //   defaultViewport: chromium.defaultViewport,
  //   excutablePath: await chromium.executablePath,
  //   headless: chromium.headless,
  //   ignoreHTTPSErrors: true,
  // });
  try {
    // const page = await browser.newPage();
    // page.setViewport({ width: 1366, height: 768 });
    // await page.goto("https://fenixmarine.voyagecontrol.com/dashboard/home");
    // await page.waitForSelector("#loginForm");
    // await page.type("#login-username", portUsername, {
    //   delay: 10,
    // });
    // await page.type("#login-password", portPassword, {
    //   delay: 10,
    // });
    // await page.click("#loginButton");
    // // Wait for logged page
    // await page.waitForNavigation();
    // await page.waitForSelector("#main-content");
    // await page.waitFor(2000);
    //
    // var accessTokenObj = await page.evaluate(() => {
    //   return localStorage.getItem("json-web-token");
    // });
    let loginData = {
      "email":portUsername,"password":portPassword,"mfaToken":""
    }
    let loginUrl = 'https://fenixmarine.voyagecontrol.com/api/jwt/login/?venue=fenixmarine';
    let loginOptions = {
      method: "post",
      url: loginUrl,
      data: loginData,
    }
    let loginResponse = await httpRequest(loginOptions);
    let validResponse = !!(loginResponse.status == 200)
    if (!validResponse) {
        logger.error(`L4JS ${port} ${containerNo} RESPONSE_CODE : ${loginResponse.response.status}`)
        detail.caution = true;
        detail.message = error.loginError;
        return getResponseValues(detail);
    }
    let postData = {
      containerIds: [containerNo],
    };
    // Inser Containers
    let optionsInsert = {
      method: "post",
      url: "https://fenixmarine.voyagecontrol.com/lynx/container/ids/insert?venue=fenixmarine",
      headers: {
        authorization: "JWT " + loginResponse.data.token,
      },
      data: postData,
    };

    httpRequest(optionsInsert);
    const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));
    await wait(1000);
    // await page.waitFor(1000);

    // Search Containers
    let optionsSearch = {
      method: "post",
      url: "https://fenixmarine.voyagecontrol.com/lynx/container/ids?venue=fenixmarine",
      headers: {
        authorization: "JWT " + loginResponse.data.token,
      },
      data: postData,
    };
    await httpRequest(optionsSearch);
    // await wait(1000);
    
    // Refresh Container Search
    let optionsrefresh = {
      method: "get",
      url: "https://fenixmarine.voyagecontrol.com/lynx/container/"+containerNo+"/status?venue=fenixmarine",
      headers: {
        authorization: "JWT " + loginResponse.data.token,
      },
      // data: postData,
    };
    let responseRefresh = await httpRequest(optionsrefresh);

    let validDataResponse = !!(responseRefresh.status == 200)
    if (!validDataResponse) {
      logger.error(`L4JS ${port} ${containerNo} RESPONSE_CODE : ${responseRefresh.status}`)
      detail.caution = true;
      detail.message = error.failedScrapeError;
      return getResponseValues(detail);
    }
    if (responseRefresh.data) {
      let cData = responseRefresh.data;
      detail.containerNo = containerNo;
      detail.extraTracerData = cData.status;
      detail.brokerHold = false;

      if (cData.status.LAST_FREE_DAY) {
        let dat = moment.tz(cData.status.LAST_FREE_DAY, timeZone);
        dat.add(
          moment(cData.status.LAST_FREE_DAY).tz(timeZone).utcOffset() * -1,
          "minutes"
        );

        detail.last_free_day = dat.toISOString();
      }
      if (cData.status["IMPEDIMENTS:ROAD"]) {
        let customFreightBrokerData =
          cData.status["IMPEDIMENTS:ROAD"].split(",");
        customFreightBrokerData.forEach((D) => {
          if (fenixJson[D]) {
            detail[fenixJson[D]] = "HOLD";
          }
          if (fenixJson[D] == "brokerHold") {
            detail.brokerHold = true;
          } else {
            detail.brokerHold = false;
          }
        });
      }
      if (cData.status.CUSTOMS) {
        detail.custom = cData.status.CUSTOMS;
      }
      if (cData.status.FREIGHT) {
        detail.freight = cData.status.FREIGHT;
      }
      if (cData.containerStatus && cData.containerStatus.name) {
        if (
          cData.containerStatus.name === "CONTAINER_STATUS_Booked" ||
          cData.containerStatus.name === "CONTAINER_STATUS_Available"
        ) {
          detail.status = "available";
        }
        if (
          cData.containerStatus.name === "CONTAINER_STATUS_NoStatus" ||
          cData.containerStatus.name === "CONTAINER_STATUS_Unavailable"
        ) {
          detail.status = "not_available";
        }
      }
    }
    if (Object.keys(detail).length <= 4) {
      delete detail.brokerHold;
      delete detail.status;
      detail.caution = true;
      detail.message = error.noDataError;
      return getResponseValues(detail);
    }
    detail.caution = false;
    return getResponseValues(detail);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    delete detail.brokerHold;
    delete detail.status;
    detail.caution = true;
    detail.message = error.failedScrapeError;
    return getResponseValues(detail);
  }
};

module.exports = fenix;
