// const puppeteer = require("puppeteer-extra");
const chromium = require('chrome-aws-lambda');
let log4js = require("log4js");
const error = require("../common/errorMessage.json");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
process.setMaxListeners(0);

const httpRequest = require("../common/httpRequest");

let browser;

const yti = async ({
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
    if ((portUsername = undefined) || (portPassword = undefined) )  {
      logger.error(`ERROR WITH UNDEFINED VALUES PORTUSERNAME ${portUsername} && PORTPASSWORD ${portPassword}`)
      finalData.container.message = error.loginError;
      finalData.container.caution = true;
      await browser.close();
      return getResponseValues(finalData.container)
    }
    await page.goto("https://yti.voyagecontrol.com/dashboard/containers/").catch(err => {
      logger.error(`L4JS ${port} ${containerNo} ${err}`)
      finalData.caution = true;
      finalData.message = 'Could not get container information!'
      browser.close();
      return finalData;
    });
    await page.waitForSelector("#loginForm");
    await page.type("#login-username", portUsername, {
      delay: 10,
    });
    await page.type("#login-password", portPassword, {
      delay: 10,
    });
    await page.click("#loginButton");
    await page.waitFor(3000);
    let failedLogin = await page
    .evaluate(async () => {
      const final = !!document.querySelector(
        '.alert-error'
      );
      return final;
    })
    .catch((err) => {
      logger.error(`L4JS Error ${err}`);
    });
    if (failedLogin) {
      finalData.caution = true;
      finalData.message = error.loginError;
      await browser.close();
      return finalData;
    }
    await page.waitForSelector("#main-content");
    await page.waitFor(2000);

    var accessTokenObj = await page.evaluate(() => {
      return localStorage.getItem("json-web-token");
    });
    let postData = {
      containerIds: [containerNo],
    };
    let options = {
      method: "post",
      url:
        "https://yti.voyagecontrol.com/lynx/container/ids?venue=yti",
      headers: {
        authorization: "JWT " + accessTokenObj,
      },
      data: postData,
    };

    let response = await httpRequest(options);
    if (response.status != 200) {
      finalData.caution = true;
      finalData.message = error.failedScrapeError;
      await browser.close();
      return finalData;
    }
    if (response.data.rows.length > 0) {
      let cData = response.data.rows[0];

      finalData.container = cData.status;

      if (cData.status.PORT_LFD) {
        let dat = moment.tz(cData.status.PORT_LFD, timeZone);
        dat.add(
          moment(cData.status.PORT_LFD).tz(timeZone).utcOffset() * -1,
          "minutes"
        );
        finalData.container.last_free_day = dat.toISOString();
      }
      if (cData.status.CUSTOMS) {
        finalData.container.custom = cData.status.CUSTOMS;
      }
      if (cData.status.FREIGHT) {
        finalData.container.freight = cData.status.FREIGHT;
      }
      finalData.container.status = cData.containerStatus.isAvailableToBook
        ? "available"
        : "not_available";
    }
    if (Object.keys(finalData.container).length <= 1) {
			finalData.caution = true;
      finalData.message = error.noDataError;
      await browser.close();
			return finalData;
		}
    finalData.caution = false;
    await browser.close();
    return finalData;
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    finalData.caution = true;
    finalData.caution = error.failedScrapeError;
    await browser.close();
    return finalData;
  }
};

module.exports = yti;
