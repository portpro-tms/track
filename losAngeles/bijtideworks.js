const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json")
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
const piera = require("./piera.json");
const getResponseValues = require("../common/getResponseValues");

const bijtideworks = async ({
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
    await page.goto("https://bij.tideworks.com/fc-BIJ/default.do")
    // Wait for page
    await page.waitForSelector("#mainForm");
    // Login Cred
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
      throw logger.error(`L4JS Error ${err}`);
    });
    if (failedLogin) {
      finalData.caution = true;
      finalData.message = error.loginError
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
    let detail = {};
    finalData.container.containerNo = containerNo;

    const options = {
      url: `https://bij.tideworks.com/fc-PCT/import/default.do?searchBy=CTR&numbers=${containerNo}&6578706f7274=1&method=defaultSearch&d-7957256-e=1&scac=`,
      method: "GET",
      headers: {
        Cookie: `JSESSIONID=${JSESSIONID}; BNI_JSESSIONID=${BNI_JSESSIONID}; __utma=${__utma}; __utmc=${__utmc}; __utmz=${__utmz}; __utmt_b=${__utmt_b}; __utmb=${__utmt_b}`,
      },
    };
    // console.log(options)
    let body = await httpRequest(options);
    if (body.response.status != 200) {
      logger.error(`L4JS Response status:${body.response.status} FOR ${port} & CONTAINERNO ${containerNo}`)
      finalData.container.caution = true;
      finalData.container.message = error.failedScrapeError;
      await browser.close(); 
      return getResponseValues(finalData.container);
    }
    let data = csvToJson(body.data);
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
      if (data[0]["Available"].toLowerCase().indexOf("notavail") > -1) {
        detail.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("may_move_offdock") > -1) {
        detail.status = "not_available";
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
        detail.brokerHold = true;
      }
    }
    if (custom) {
      detail.custom = piera[custom];
    }
    if (freight) {
      detail.freight = piera[freight];
    }
    
    await browser.close();
    finalData.container = detail
    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await browser.close();
    finalData.container.caution = false;
    return getResponseValues(finalData.container);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    if (browser) {
      await browser.close();
    }
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = bijtideworks;
