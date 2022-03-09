const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");

const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
const piera = require("./piera.json");
const getResponseValues = require("../common/getResponseValues");

const pcttideworks = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  var finalData = {
    container: {},
  };
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  if ((portUsername == undefined || portPassword == undefined) )  {
    logger.error(`L4JS ERROR WITH UNDEFINED VALUES PORTUSERNAME ${portUsername} && PORTPASSWORD ${portPassword} FOR ${port} AND ${containerNo}`)
    finalData.container.message = error.loginError;
    finalData.container.caution = true;
    await browser.close();
    return getResponseValues(finalData.container);
  }
  
  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1366, height: 768 });
    await page.goto("https://pct.tideworks.com/fc-PCT/default.do").catch(err => {
      logger.error(`L4JS FOR ${port} & ${containerNo} ${err}`)
      finalData.caution = `Could not reach port site currenlty!`;
      browser.close();
      return finalData;
    });
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
      logger.error(`L4JS Error ${err}`);
    });

    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container)
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
      url: `https://pct.tideworks.com/fc-PCT/import/default.do?searchBy=CTR&numbers=${containerNo}&6578706f7274=1&method=defaultSearch&d-7957256-e=1&scac=`,
      method: "GET",
      headers: {
        Cookie: `JSESSIONID=${JSESSIONID}; BNI_JSESSIONID=${BNI_JSESSIONID}; __utma=${__utma}; __utmc=${__utmc}; __utmz=${__utmz}; __utmt_b=${__utmt_b}; __utmb=${__utmt_b}`,
      },
    };
    let body = await httpRequest(options);
    if (body.status != 200) {
      finalData.container.caution = true;
      finalData.container.message = error.failedScrapeError;
      await browser.close();
      return getResponseValues(finalData.container)
    }
    let data = csvToJson(body.data);
    if (data && data[0]["Available"]) {
      if (data[0]["Available"].toLowerCase().indexOf("available") > -1) {
        finalData.container.status = "available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("not available") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("off-dock") > -1) {
        finalData.container.status = "not_available";
      }
      if (data[0]["Available"].toLowerCase().indexOf("notavail") > -1) {
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
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container)
    }
    finalData.container.caution = false;
    await browser.close();
    return getResponseValues(finalData.container)
  } catch (e) {
    logger.error(`L4JS PORT ${port} CONTAINERNNO ${containerNo} ${e}`)
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    if (browser) {
      await browser.close();
    }
    return getResponseValues(finalData.container)
  }
};

module.exports = pcttideworks;
