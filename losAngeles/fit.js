//https://forecast.fitpev.com/fc-FIT/default.do

const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json")
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
const getResponseValues = require("../common/getResponseValues");

const fitpev = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1366, height: 768 });
    await page.goto("https://forecast.fitpev.com/fc-FIT/default.do").catch((err => {
      logger.error(`L4321234JS PORT ${port} CONTAINERNO ${containerNo} ${err}`);
      finalData.caution = 'Could not visit port site! We will try again later!';
      browser.close();
      return finalData;
    }));
    await page.waitForSelector("#mainForm");
    await page.type("#j_username", portUsername, {
      delay: 10,
    });
    await page.type("#j_password", portPassword, {
      delay: 10,
    });
    await page.click("#signIn");
    await page.waitFor(3000);

    let failedLogin = await page
    .evaluate(() => {
      const final = !!document.querySelector(".login-failure");
      return final;
    })
    .catch((err) => {
      logger.error(`L4JS ${port} ${containerNo} ${err}`)
    });
    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    let cookies = await page.cookies();
    let JSESSIONID,
      BNI_JSESSIONID,
      __utma,
      __utmc,
      __utmz,
      __utmt,
      __utmt_b,
      __utmb;
    cookies.forEach((cookie, i) => {
      if (cookie.name == "JSESSIONID") {
        JSESSIONID = cookie.value;
      }
      if (cookie.name == "BNI_JSESSIONID") {
        BNI_JSESSIONID = cookie.value;
      }
      if (cookie.name == "__utma") {
        __utma = cookie.value;
      }
      if (cookie.name == "__utmc") {
        __utmc = cookie.value;
      }
      if (cookie.name == "__utmz") {
        __utmz = cookie.value;
      }
      if (cookie.name == "__utmt") {
        __utmt = cookie.value;
      }
      if (cookie.name == "__utmt_b") {
        __utmt_b = cookie.value;
      }
      if (cookie.name == "__utmb") {
        __utmb = cookie.value;
      }
    });
    const options = {
      url: `https://forecast.fitpev.com/fc-FIT/default.do?searchBy=CTR&numbers=${containerNo}&6578706f7274=1&method=defaultSearch&d-7957256-e=1&scac=`,
      method: "GET",
      headers: {
        Cookie: `JSESSIONID=${JSESSIONID}; BNI_JSESSIONID=${BNI_JSESSIONID}; __utma=${__utma}; __utmc=${__utmc}; __utmz=${__utmz}; __utmt_b=${__utmt_b}; __utmb=${__utmt_b}`,
      },
    };
    let body = await httpRequest(options);
    if (body.status != 200) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    let data = csvToJson(body && body.data ? body.data : "");
    if (data && data[0]["Available"]) {
      if (data[0]["Available"].toLowerCase().indexOf("available") > -1) {
        finalData.container.status = "available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("not available") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("off-dock") > -1) {
        finalData.container.status = "available";
      }
    }
    if (data && data[0]["Satisfied Thru"]) {
      let dat = moment.tz(data[0]["Satisfied Thru"], timeZone);
      dat.add(
        moment(data[0]["Satisfied Thru"]).tz(timeZone).utcOffset() * -1,
        "minutes"
      );
      finalData.container.last_free_day = dat.toISOString();
    }
    if (data && data[0]["Holds"]) {
      if (data[0]["Holds"] == "DISCHHLD") {
        finalData.container.freight = "HOLD";
      }
      if (data[0]["Holds"] == "NONE" || data[0]["Holds"] == "CLEARED") {
        finalData.container.freight = "RELEASED";
      }
    }
    if (data && data[0]["Customs Release Status"]) {
      if (data[0]["Customs Release Status"] == "DISCHHLD") {
        finalData.container.custom = "HOLD";
      }
      if (
        data[0]["Customs Release Status"] == "NONE" ||
        data[0]["Customs Release Status"] == "CLEARED"
      ) {
        finalData.container.custom = "RELEASED";
      }
    }
    if (Object.keys(finalData.container).length <= 1) {
			finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
			return getResponseValues(finalData.container);
		}
    finalData.container.caution = false;
    await browser.close();
    return getResponseValues(finalData.container);
  } catch (e) {
    console.log(e)
    await browser.close();
    logger.error(`L1234JS ${port} and ${containerNo} ${e}`)
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = fitpev;
