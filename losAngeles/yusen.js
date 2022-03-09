const chromium = require("chrome-aws-lambda");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const axios = require("axios").default;
const moment = require("moment");
require("moment-timezone");
const getResponseValues = require("../common/getResponseValues");
const error = require("../common/errorMessage.json");
process.setMaxListeners(0);
let browser;

const httpRequest = async (options = {}, data = {}) => {
  // pass url, headers as options and payload as data
  try {
    let resp = await axios(options, data);
    return resp;
  } catch (e) {
    return undefined;
  }
};
const yusen = async ({
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

    await page.goto("https://lynx.yti.com/?AspxAutoDetectCookieSupport=1");
    await page.type("#username", portUsername, {
      delay: 10,
    });
    await page.type("#password", portPassword, {
      delay: 10,
    });
    await page.click("#login-submit-btn");
    await page.waitForTimeout(2000);
    let failedLogin = await page.evaluate(async () => {
      const final = !!document.querySelector(".alert-error");
      return final;
    });

    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await page.waitFor(2000);

    let cookieArray = await page.cookies();
    let sessionId, terminalAccess;
    cookieArray.forEach((item, i) => {
      if (item.name == "ASP.NET_SessionId") {
        sessionId = item.value;
      }
      if (item.name == ".VITTerminalAccess_ASPXAUTH") {
        terminalAccess = item.value;
      }
    });

    let cookie = `ASP.NET_SessionId=${sessionId}; _ga=GA1.2.1443407004.1619848202; _gid=GA1.2.1236811493.1619848202; .VITTerminalAccess_ASPXAUTH=${terminalAccess}; Language=en-US`;
    let options = {
      method: "post",
      url: `https://lynx.yti.com/VITTerminalAccess/GetReleaseInquiryList.aspx?WhichReq=Container&ContainerNum=${containerNo}&BOLNum=&PTD=&ContainerNotification=false&Page=Import+Release+Inquiry&SearchType=Container&_=${containerNo}`,
      headers: {
        cookie,
      },
    };

    let data = await httpRequest(options);
    let isError = data && data.data && data.data.Error;
    if (isError) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }

    let thatData =
      data && data.data && data.data.aaData.length > 0 && data.data.aaData[0]
        ? data.data.aaData[0]
        : null;
    if (thatData && thatData.length>0) {
      thatData = thatData.splice(
        thatData.indexOf(containerNo) - 1,
        thatData.length
      );

      if (thatData && thatData[8] && thatData[8] != "") {
        let dat = moment(thatData[8]).tz(timeZone);
        dat.add(moment(thatData[8]).tz(timeZone).utcOffset() * -1, "minutes");
        finalData.container.last_free_day = dat.toISOString();
      }
      if (thatData && thatData[10] && thatData[10] != "") {
        let dat = moment(thatData[10]).tz(timeZone);
        dat.add(moment(thatData[10]).tz(timeZone).utcOffset() * -1, "minutes");
        finalData.container.last_free_day = dat.toISOString();
      }
      if (thatData && thatData[5] && thatData[5] != "") {
        finalData.container.custom = thatData[5];
      }
      if (thatData && thatData[6] && thatData[6] != "") {
        finalData.container.freight = thatData[6];
      }
      if (
        thatData &&
        thatData[0] &&
        thatData[0] != "" &&
        thatData[0].toLowerCase() == "no"
      ) {
        finalData.container.status = "not_available";
      }
      if (
        thatData &&
        thatData[0] &&
        thatData[0] != "" &&
        thatData[0].toLowerCase() == "yes"
      ) {
        finalData.container.status = "available";
      }
      if (
        thatData &&
        thatData[4] &&
        thatData[4] != "" &&
        thatData[4].toLowerCase().indexOf("tmf") > -1
      ) {
        finalData.container.brokerHold = true;
      }else{
        finalData.container.brokerHold = false;
      }
    }

    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await browser.close();
    return finalData;
  } catch (e) {
    await browser.close();
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};
module.exports = yusen;
