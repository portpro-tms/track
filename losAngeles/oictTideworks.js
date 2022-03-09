const chromium = require("chrome-aws-lambda");
let log4js = require("log4js");
const { addExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const error = require("../common/errorMessage.json");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
const piera = require("./piera.json");
const getResponseValues = require("../common/getResponseValues");
const puppeteerExtra = addExtra(chromium.puppeteer);
const randomUA = require("modern-random-ua");
const useProxy = require("puppeteer-page-proxy");
const getProxyDetails = require("../common/proxy");
// const devices = puppeteer.devices;
// const iPhone = devices['iPhone 6'];

puppeteerExtra.use(StealthPlugin());

const oict = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };
  let proxy = await getProxyDetails();
  let args = chromium.args;
  if (proxy && proxy.curl) {
    console.log('proxy', proxy)
  
    args = [...chromium.args, `--proxy-server=${proxy.curl}`];
  }
  const browser = await puppeteerExtra.launch({
    args: args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
    // userAgent: randomUA.generate(),
  });
  try {
    const page = await browser.newPage();
    // await page.emulate(iPhone);
    // page.setViewport({ width: 1366, height: 768 });

    await page
      .goto("http://b58.tideworks.com/fc-OICT/default.do")
      .catch((err) => {
        logger.error(`L4JS FOR ${port} & ${containerNo} ${err}`);
        finalData.caution = `Could not reach port site currenlty!`;
        browser.close();
        return finalData;
      });
    await page.waitForSelector("#mainForm");
    await page.type("#j_username", portUsername, {
      delay: 10,
    });
    await page.type("#j_password", portPassword, {
      delay: 10,
    });
    await page.click("#signIn");
    await page.waitForTimeout(3000);

    let failedLogin = await page
      .evaluate(() => {
        const final = !!document.querySelector(".login-failure");
        return final;
      })
      .catch((err) => {
        throw logger.error(`L4JS Error ${err}`);
      });
    if (failedLogin) {
      finalData.caution = true;
      finalData.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData);
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
    finalData.container.containerNo = containerNo;
    const options = {
      url: `https://b58.tideworks.com/fc-OICT/import/default.do?searchBy=CTR&numbers=${containerNo}&6578706f7274=1&method=defaultSearch&d-7957256-e=1&scac=`,
      method: "GET",
      headers: {
        Cookie: `JSESSIONID=${JSESSIONID}; BNI_JSESSIONID=${BNI_JSESSIONID}; __utma=${__utma}; __utmc=${__utmc}; __utmz=${__utmz}; __utmt_b=${__utmt_b}; __utmb=${__utmt_b}`,
      },
    };
    let body = await httpRequest(options);

    if (body.status != 200) {
      finalData.caution = true;
      finalData.message = error.failedScrapeError;
      await browser.close();
      return getResponseValues(finalData);
    }
    let data = csvToJson(body && body.data ? body.data : "");
    if (data && data[0]["Available"]) {
      if (data[0]["Available"].toLowerCase().indexOf("available") > -1) {
        finalData.container.status = "available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("not available") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("notavail") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("off-dock") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("may_move_offdock") > -1) {
        finalData.container.status = "not_available";
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
    let holds = data && data[0]["Holds"] ? data[0]["Holds"] : null;
    let custom =
      data && data[0]["Customs Release Status"]
        ? data[0]["Customs Release Status"]
        : null;
    let freight =
      data && data[0]["Line Release Status"]
        ? data[0]["Line Release Status"]
        : null;

    if (holds) {
      if (holds == "TMFHOLD") {
        finalData.container.brokerHold = true;
      }
    }
    if (custom) {
      finalData.container.custom = piera[custom];
    }
    if (freight) {
      finalData.container.freight = piera[freight];
    }
    if (Object.keys(finalData.container).length <= 1) {
      finalData.caution = true;
      finalData.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData);
    }

    await browser.close();
    finalData.caution = false;
    return getResponseValues(finalData.container);
  } catch (e) {
    logger.error(`L4JS FOR PORT ${port} and CONTAINER ${containerNo} ${e}`);
    finalData.caution = true;
    finalData.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(finalData);
  }
};

module.exports = oict;
