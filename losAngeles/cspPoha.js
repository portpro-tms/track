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

const cspPoha = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  var finalData = {
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
      let allErrors = containerNo.map((D) => {
        let finalData = {
          container: {
            container_no: D,
            caution: true,
            message: error.loginError,
          },
        };
        return finalData;
      });
      await browser.close();
      return allErrors;
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
      ContainerNum: containerNos,
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
      let allErrors = containerNo.map((D) => {
        let finalData = {
          container: {
            container_no: D,
            caution: true,
            message: error.failedScrapeError,
          },
        };
        return finalData;
      });
      await browser.close();
      return allErrors;
    }

    let data = body && body.data ? body.data.aaData : "";
    if (data) {
      let aaData = body.data.aaData;
      finalDatas = containerNo.map((container, index) => {
        let row;
        let obj = {
          container: {
            container_no: container,
            caution: false,
          },
        };
        aaData.forEach((eachData) => {
          if (eachData.indexOf(container.trim()) > -1) {
            row = eachData;
          }
        });

        if (row) {
          obj.container.status =
            row[1].toLowerCase() === "yes" ? "available" : "not_available";
          obj.container.custom = row[6];
          obj.container.freight = row[7];
          if (row[10]) {
            let ldat = moment(row[10], "MM/DD/YYYY");
            let dat = moment.tz(ldat, timeZone);
            dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
            obj.container.last_free_day = dat.toISOString();
          } else if(row[9]){
            let ldat = moment(row[9], "MM/DD/YYYY");
            let dat = moment.tz(ldat, timeZone);
            dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
            obj.container.last_free_day = dat.toISOString();
          }else{
            obj.container.last_free_day = null;
          }
        } else {
          obj.container.caution = true;
          obj.container.message = error.noDataError;
        }
        return obj;
      });
    }
    await browser.close();
    //return finalData;
    return finalDatas.length > 0 ? finalDatas : { container: {} };
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    if (browser) {
      await browser.close();
    }
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = cspPoha;
