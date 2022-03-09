// const puppeteer = require("puppeteer-extra");
const chromium = require("chrome-aws-lambda");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
const getResponseValues = require("../common/getResponseValues");
require("moment-timezone");
const error = require("../common/errorMessage.json")
process.setMaxListeners(0);
const httpRequest = require("../common/httpRequest");

let browser;

const tti = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let res = {
    container: {},
  };
  try {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

    let failedLogin;
    const page = await browser.newPage();
    await page.goto("https://www.ttilgb.com/main/index.do")
    await page.waitForTimeout(1 * 1000);

    if (portUsername == undefined || portPassword == undefined )  {
      logger.error(`L4JS ERROR WITH UNDEFINED VALUES PORTUSERNAME ${portUsername} && PORTPASSWORD ${portPassword} for ${port} and ${containerNo}`)
      res.container.caution = true;
      res.container.message = error.loginError;
      await browser.close();
      return getResponseValues(res.container)
    }


    await page.waitForSelector("#pUsrId");
    await page.focus("#pUsrId");
    await page.type("#pUsrId", portUsername, {
      delay: 10,
    });
    await page.type("#pUsrPwd", portPassword, {
      delay: 10,
    });
    await page.on("dialog", (dialog) => {
      let dialogMessgage = dialog._message
      if (dialogMessgage == 'User Information is not correct. Please try again') {
        failedLogin = true;
      }
      dialog.accept();
    });
    await page.click(
      "#form > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(3) > td > table:nth-child(1) > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td:nth-child(3) > img"
    );
    await page.waitForTimeout(1 * 1000);
    if (failedLogin) {
      res.container.caution = true;
      res.container.message = error.loginError;
      await browser.close();
      return getResponseValues(res.container);
    }

    
    
    //
    await page.goto(
      `https://www.ttilgb.com/uiArp02Action/searchContainerInformationListByCntrNo.do?srchTpCd=C&cntrNo=${containerNo}&acssHis=USLGB,0245APP,0346052,WCIM&authKey=1010110101100011000010011010`
    );
    const html = await page.content();
    var j = html.slice(html.indexOf("["), html.indexOf("]") + 1);
    let finalData = JSON.parse(j);
    if (finalData && finalData[0]) {
      if (finalData[0].lstFreeDt) {
        let dat = moment.tz(finalData[0].lstFreeDt, timeZone);
        dat.add(
          moment(finalData[0].lstFreeDt).tz(timeZone).utcOffset() * -1,
          "minutes"
        );
        res.container.last_free_day = dat.toISOString();
      }
      if (
        finalData[0].custHold &&
        finalData[0].custHold.toLowerCase() == "released"
      ) {
        res.container.custom = "RELEASED";
      } else if (
        finalData[0].custHold &&
        finalData[0].custHold.toLowerCase() == "hold"
      ) {
        res.container.custom = "HOLD";
      } else {
        res.container.custom = "HOLD";
      }
      if (
        finalData[0].cusmHold &&
        finalData[0].cusmHold.toLowerCase() == "released"
      ) {
        res.container.freight = "RELEASED";
      } else if (
        finalData[0].cusmHold &&
        finalData[0].cusmHold.toLowerCase() == "hold"
      ) {
        res.container.freight = "HOLD";
      } else {
        res.container.freight = "HOLD";
      }
      if (finalData[0].tmfFlg && finalData[0].tmfFlg.toLowerCase() == "hold") {
        res.container.brokerHold =true;
      } else if (finalData[0].tmfFlg && finalData[0].tmfFlg.toLowerCase() == "released") {
        res.container.brokerHold =false;
      } else {
        res.container.brokerHold =false;
      }
      if (finalData[0].avlbFlg && finalData[0].avlbFlg.toLowerCase() == "no") {
        res.container.status = "not_available";
      } else if (
        finalData[0].avlbFlg &&
        finalData[0].avlbFlg.toLowerCase() == "yes"
      ) {
        res.container.status = "available";
      }
    }

    if (Object.keys(res.container).length <= 1) {
			res.container.caution = true;
      res.container.message = error.noDataError;
      await browser.close();
			return getResponseValues(res.container);
		}
    res.container.caution = false;
    await browser.close();
    return getResponseValues(res.container);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    res.container.caution = true;
    res.container.message = error.failedScrapeError;
    return getResponseValues(res.container);
  }
};

module.exports = tti;
