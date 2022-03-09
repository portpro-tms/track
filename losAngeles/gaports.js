const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
var randomip = require("random-ip");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
let attempt = 0;

const gaports = async ({
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
    args: [...chromium.args],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
    stealth: true,
  });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on("request", async (req) => {
      if (["image"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(
      "http://webaccess.gaports.com/express/secure/Today.jsp?Facility=GCT",
      {
        slowMo: 250,
      }
    );

    await page.waitForTimeout(3000);
    await page.waitForSelector("#printContent");
    await page.waitForSelector(".loginTable");

    // Login Cred
    await page.type("input[name=j_username]", portUsername, {
      delay: 10,
    });
    await page.type("input[name=j_password]", portPassword, {
      delay: 10,
    });

    await page.click(".loginSubmitRow button[value=submit]", {
      delay: 10,
    });

    // // Wait for logged page
    await page.waitForTimeout(5000);

    let failedLogin = await page
      .evaluate(() => {
        const loginCheck = " You have only  9 attempt(s) remaining";
        const loginCheckDom = document.querySelector(".errormsg").textContent;
        const final = !!(loginCheck === loginCheckDom);
        return final;
      })
      .catch((err) => {
        logger.error(`L4JS ${port} ${containerNo} ${err}`);
      });
    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await page.waitForSelector("#mainRow2");

    await page.goto(
      "http://webaccess.gaports.com/express/displayReport.do?param=DeliveryInq"
    );

    // await page.waitForNavigation();
    await page.waitForSelector(".positionReports");
    // container No
    await page.type("textarea[name=eqNbrs]", containerNo, {
      delay: 10,
    });

    let element = await page.$("select#fromtrkcID");
    let value = await page.evaluate((el) => el.textContent, element);
    let finalValue = value.split(":");
    await page.type("input[name=trkcID]", finalValue[0], {
      delay: 10,
    });
    await page.click("#btnsubmit");
    // // await page.waitForNavigation();
    await page.waitForSelector(
      "#Table1 > tbody:nth-child(1) > tr:nth-child(1)"
    );

    let loadedDetail = await page.evaluate(() => {
      let container = {};
      let resultRows = document.querySelector(
        "table#Table1 tbody.tablebody1 tr.even"
      );
      if (resultRows) {
        let tds = resultRows.querySelectorAll("td");
        if (tds.length > 1) {
          container.containerNo = tds[1].innerText;
          container.custom = tds[8].innerText;
          container.freight = tds[7].innerText;
          let statImage = tds[0].querySelector("img");
          if (statImage) {
            container.status =
              statImage.getAttribute("title") == "No"
                ? "not_available"
                : "available";
          }
        }
      }

      return container;
    });

    finalData.container = loadedDetail;
    finalData.container.caution = false;
    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    await browser.close();
    return getResponseValues(finalData.container);
  } catch (e) {
    await browser.close();
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    return getResponseValues(finalData.container);
  }
};

module.exports = gaports;
