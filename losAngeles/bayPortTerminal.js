const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
const getResponseValues = require("../common/getResponseValues");

const bayPortTerminal = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };
  let finalDatas = [];
  let portName = port.toLowerCase();
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
    await page.goto("https://csp.poha.com/lynx/login.aspx");
    // Wait for page
    await page.waitForSelector(".login-form");
    // Login Cred
    await page.type("#username", portUsername, {
      delay: 10,
    });
    await page.type("#password", portPassword, {
      delay: 10,
    });
    await page.click("#login-submit-btn");
    await page.waitFor(5000);
    let failedLogin = await page
      .evaluate(async () => {
        const final = !!document.querySelector("#login-error");
        return final;
      })
      .catch((err) => {
        logger.error(`L4JS Error ${err}`);
      });

    if (failedLogin) {
        let finalData = {
          container: {
            container_no: containerNo,
            caution: true,
            message: error.loginError,
          },
        };
        await browser.close();
        return finalData;
    }

    let cookies = await page.cookies();
    let aspSessionId,
      AspxAutoDetectCookieSupport,
      VitTerminal,
      _ga,
      _gid,
      language;
    cookies.forEach((cookie, i) => {
      if (cookie.name == "AspxAutoDetectCookieSupport") {
        AspxAutoDetectCookieSupport = cookie.value;
      }
      if (cookie.name == "ASP.NET_SessionId") {
        aspSessionId = cookie.value;
      }
      if (cookie.name == ".VITTerminalAccess_ASPXAUTH") {
        VitTerminal = cookie.value;
      }
      if (cookie.name == "_ga") {
        _ga = cookie.value;
      }
      if (cookie.name == "_gid") {
        _gid = cookie.value;
      }
      if (cookie.name == "Language") {
        language = cookie.value;
      }
    });

    // console.log(cookies);
    let _token = `_ga=GA1.2.130625727.1636705947; ASP.NET_SessionId=${aspSessionId}; Language=en-US; .VITTerminalAccess_ASPXAUTH=${VitTerminal};`;
    // let TermIdentifier = 3;
    // await page.waitFor(5000);
    // await page.click('.dropdown-toggle')
    // await page.waitFor(3000);
    // if (port.startsWith("bayport terminal")) {
    //   await page.select('#ddnChngTerminal', '4')
    //   TermIdentifier = 4;
    // }
    // if (port.startsWith("barbours cut terminals")) {
    //   await page.select('#ddnChngTerminal', '3')
    //   TermIdentifier = 3;
    // }
    // let updateParams = {
    //   Action: 'GetCurrentQuickLinks',
    //   TermIdentifier
    // };

    // let updateTerminal = {
    //   url: `https://csp.poha.com/Lynx/VITTerminalAccess/UpdateMultiTerminal.aspx`,
    //   method: "GET",
    //   headers: {
    //     Cookie: _token,
    //   },
    //   params : updateParams
    // }

    // let updateTerminalRequest = await httpRequest(updateTerminal);
    // await page.waitForNavigation();
    let containerNos = containerNo.toString();
    let params = {
      WhichReq: "Container",
      ContainerNum: containerNo,
      BOLNum: "",
      PTD: "",
      ContainerNotification: true,
      _: moment().tz(timeZone).valueOf(),
    };
    const options = {
      url: `https://csp.poha.com/Lynx/VITTerminalAccess/GetReleaseInquiryList.aspx`,
      method: "GET",
      headers: {
        Cookie: _token,
      },
      params: params,
    };
    let body = await httpRequest(options);
    if (body.status != 200) {
        let finalData = {
          container: {
            container_no: containerNo,
            caution: true,
            message: error.failedScrapeError,
          },
        };
        await browser.close();
        return finalData;
    }

    let data = body && body.data ? body.data.aaData : "";
    if (data) {
      let aaData = body.data.aaData;
        if (aaData.length > 0) {
          let row=aaData[0];
          finalData.container.status =
            row[1].toLowerCase() === "yes" ? "available" : "not_available";
          finalData.container.custom = row[6];
          finalData.container.freight = row[7];
          if (row[10]) {
            let ldat = moment(row[10], "MM/DD/YYYY");
            let dat = moment.tz(ldat, timeZone);
            dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
            finalData.container.last_free_day = dat.toISOString();
          } else if(row[9]){
            let ldat = moment(row[9], "MM/DD/YYYY");
            let dat = moment.tz(ldat, timeZone);
            dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
            finalData.container.last_free_day = dat.toISOString();
          }else{
            finalData.container.last_free_day = null;
          }
        } else {
          finalData.container.caution = true;
          finalData.container.message = error.noDataError;
        }
    }
    await browser.close();
    //return finalData;
    return getResponseValues(finalData.container);
  } catch (e) {
    console.log(e);
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    if (browser) {
      await browser.close();
    }
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = bayPortTerminal;
