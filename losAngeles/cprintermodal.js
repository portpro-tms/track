const chromium = require("chrome-aws-lambda");
var randomip = require("random-ip");

const moment = require("moment");
require("moment-timezone");

const httpRequest = require("../common/httpRequest");
const proxy = require("../common/proxy");
const csvToJSON = require("../common/csvtojson");

const error = require("../common/errorMessage.json");

const getResponseValues = require("../common/getResponseValues");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
let attempt = 0;

const cprintermodal = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {};
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

    const navigationPromise = page.waitForNavigation({
      waitUntil: ["networkidle2"],
    });
    page.on("request", async (req) => {
      if (["image"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto("https://www8.cpr.ca/cpcustomerstation/", {
      slowMo: 250,
    });

    await navigationPromise;
    await page.waitForSelector(".login_container");
    await page.waitForSelector(".login_inputwrapper");
    await page.waitForSelector("#username");

    await page.waitForTimeout(2000);
    // Login Cred
    await page.type("input[name=username]", portUsername, {
      delay: 50,
    });
    await page.type("input[name=password]", portPassword, {
      delay: 50,
    });

    await page.waitForTimeout(100);
    // submit form amd wait for navigation to a new page
    await Promise.all([
      page.click("button[type=submit]"),
      page.waitForTimeout(3000),
    ]);

    try {
      const newUrl = await page.evaluate(() => location.href).then((rr) => rr);
      if (newUrl.startsWith("https://www8.cpr.ca/pkmslogin.form")) {
        // Failed credential
        finalData.caution = true;
        finalData.message = error.loginError;
        await browser.close();
        return getResponseValues(finalData);
      }
    } catch (e) {
      logger.error(`L4JS ${port} ${containerNo} ${e}`);
    }

    await page.goto("https://cpintermodal.cpr.ca/customer/LoadTracing.do");
    let ctrNN = containerNo.split(/([0-9]+)/);
    // ctrNN[1] = ctrNN[1].substring(0, 6);
    let ctrNbr = ctrNN[0] + ctrNN[1];
    // console.log('contaierNo',ctrNbr)
    await page.waitForTimeout(2000);

    await page.waitForSelector("#byTrailer");
    await page.type("textarea[name=paramValue3470]", ctrNbr, {
      delay: 25,
    });

    // await page.click("input[name="paramValue3478"]");
    await page.$eval(
      'input[name="paramValue3478"]',
      (check) => (check.checked = true)
    );
    await page.click("input[value=Run]");

    await page.waitForTimeout(1 * 5000);
    await navigationPromise;
    await page.waitForSelector("table#rowTable");

    let loadedDetail = await page.evaluate(() => {
      let resultRows = document.querySelectorAll(
        "table#rowTable.tablesorter1.tablesorter.tablesorter-default tr"
      );
      let container = [];
      for (var i = 0; i < resultRows.length; i++) {
        var row = [],
          cols = resultRows[i].querySelectorAll("td, th");
        for (var j = 0; j < cols.length; j++) {
          let innerval = cols[j].innerText;
          innerval = innerval.replace(/[,''\r\n]/g, " ");
          row.push(innerval);
        }
        container.push(row.join(","));
      }
      return container.join("\n");
    });
    let details = csvToJSON(loadedDetail);
    let detail = details[0];
    if (detail["Last Free Day"]) {
      let ldat = moment(detail["Last Free Day"], "MM/DD/YYYY");
      let dat = moment.tz(ldat, timeZone);
      dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
      finalData.last_free_day = dat.toISOString();
    }
    if (detail["Act Arrival (or Exp)"]) {
      let etdat = moment(detail["Act Arrival (or Exp)"], "MM/DD/YYYY");
      let dat = moment.tz(etdat, timeZone);
      dat.add(moment(etdat).tz(timeZone).utcOffset() * -1, "minutes");
      finalData.vesselEta = dat.toISOString();
    }
    if (detail["Equipment Status"]) {
      if (detail["Equipment Status"].trim() === "Not Available") {
        finalData.status = "not_available";
      }
      if (detail["Equipment Status"].trim() === "Available") {
        finalData.status = "available";
      }
    }
    if (detail["Holds"] && detail["Holds"] === "Customs") {
      finalData.custom = "HOLD";
    }
    if (detail["Holds"] && detail["Holds"] === "Yes") {
      finalData.custom = "HOLD";
    }
    if (finalData.last_free_day && detail["Holds"] && detail["Grounded"]) {
      if (detail["Holds"] === "None" && detail["Grounded"] === "Yes") {
        finalData.status = "available";
      }
    }
    if (Object.keys(finalData).length <= 1) {
      finalData.caution = true;
      finalData.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData);
    }
    finalData.extraTracerData = detail;
    finalData.caution = false;
    await browser.close();
    return getResponseValues(finalData);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    finalData.caution = true;
    finalData.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(finalData);
  }
};

module.exports = cprintermodal;
