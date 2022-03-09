const chromium = require("chrome-aws-lambda");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const error = require("../common/errorMessage.json")
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
var cheerio = require("cheerio");
const getResponseValues = require("../common/getResponseValues");
const t18tideworks = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };
  let failedLogin = {};
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
    await page.goto("http://tns.uswut.com/main/index.do").catch(err => {
      logger.error(`L4JS ${port} ${containerNo} ${err}`)
      finalData.container.caution = true;
      finalData.container.message = 'Could not load port site!'
      browser.close();
      return getResponseValues(finalData.container);
    });

    await page.on("dialog", async (dialog) => {
      failedLogin["dialogMessage"] = await dialog.message();
      await dialog.dismiss();
    });

    await page.waitForSelector("#pUsrId");
    await page.type("#pUsrId", portUsername, {
      delay: 10,
    });
    await page.waitForSelector("#pUsrPwd");
    await page.type("#pUsrPwd", portPassword, {
      delay: 10,
    });
    await page.keyboard.down("Enter");
    await page.waitFor(3000);

    finalData.container.containerNo = containerNo;
    let url = `http://tns.uswut.com/uiArp02Action/searchContainerInformationListByCntrNo.do?tmlCd=USTIW&srchTpCd=C&cntrNo=${containerNo}&acssHis=USTIW,0245APP,0346046,${portUsername}&authKey=111111111000111001100110100`;

    await page.goto(url);

    if (
      failedLogin.dialogMessage == "Session Timed Out. Please Login Again!!"
    ) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }

    if (
      failedLogin.dialogMessage ==
      "Container Not Found (please check back later or Contact Carrier)"
    ) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }

    await page.waitForSelector("#gbox_grid1");
    let loadedDetail = await page.evaluate(() => {
      let tds = document.querySelectorAll("table#grid1 tr.jqgrow td");
      let container = {};
      if (tds && tds.length > 0) {
        container.containerNo = tds[1].innerText;

        if (tds[3] && tds[3].innerText.toLowerCase() === "yes") {
          container.status = "available";
        } else {
          container.status = "not_available";
        }

        if (tds[9] && tds[9].innerText.toLowerCase() == "released()") {
          container.custom = "RELEASED";
        }
        if (tds[9] && tds[9].innerText.toLowerCase() == "hold") {
          container.custom = "HOLD";
        }

        if (tds[10] && tds[10].innerText.toLowerCase() == "released") {
          container.freight = "RELEASED";
        }
        if (tds[10] && tds[10].innerText.toLowerCase() == "hold") {
          container.freight = "HOLD";
        }

        if (tds[15]) {
          container.last_free_day = tds[15].innerText;
        }
      }
      return container;
    });
    if (loadedDetail && loadedDetail.last_free_day) {
      let dat = moment.tz(loadedDetail.last_free_day, timeZone);
      dat.add(
        moment(loadedDetail.last_free_day).tz(timeZone).utcOffset() * -1,
        "minutes"
      );
      loadedDetail.last_free_day = dat.toISOString();
    }
    finalData.container = loadedDetail;
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
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(finalData.container);
  }
};

module.exports = t18tideworks;
