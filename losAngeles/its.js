// const puppeteer = require("puppeteer-extra");
const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
const moment = require("moment");
require("moment-timezone");
process.setMaxListeners(0);
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const getResponseValues = require("../common/getResponseValues");

const its = async ({
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
    await page.goto("https://tms.itslb.com/tms2/Account/Login").catch(err => {
      logger.error(`L4JS FOR ${port} & ${containerNo} ${err}`);
      browser.close();
      throw finalData.container.caution = `Could not reach port site currenlty!We will try again later!`;
      // return finalData;
    });

    await page.waitForSelector("#UserName");
    await page.type("#UserName", portUsername, {
      delay: 10,
    });
    await page.type("#Password", portPassword, {
      delay: 10,
    });
    await page.click("#loginForm > form > div:nth-child(9) > div > input");
    await page.waitFor(1500);
    let failedLogin = await page
    .evaluate(() => {
      const final = !!document.querySelector(".validation-summary-errors");
      return final;
    })
    .catch((err) => {
      logger.error(`L4JS FOR ${port} & ${containerNo} ${err}`)
    });

    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await page.click(
      "body > div.navbar.navbar-inverse.navbar-fixed-top > div > div.navbar-collapse.collapse > ul > li:nth-child(2) > a"
    );
    await page.click(
      "body > div.navbar.navbar-inverse.navbar-fixed-top > div > div.navbar-collapse.collapse > ul > li.dropdown.open > ul > li > a"
    );

    await page.waitForSelector("#refNums");
    await page.click(
      "#refNums"
    );
    await page.type("#refNums", containerNo, {
      delay: 20,
    });
    await page.click(
      "#formAvailabilityHeader > div > div.col-md-8 > div > div.input-group > div > button"
    );
    await page.waitFor(1500);
    await page.addScriptTag({
      url: "https://code.jquery.com/jquery-2.2.4.min.js",
    });
    let table = await page.evaluate(() => {
      return $("#formAvailabilityBody > div.table-responsive > table")
        .map(function () {
          return $(this)
            .find("td")
            .map(function () {
              return $(this).text().trim();
            })
            .get();
        })
        .get();
    });
    if (table.length < 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
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
    await browser.close();
    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    finalData.container.caution = false;
    return getResponseValues(finalData.container);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(finalData.container);
  }
};

module.exports = its;
