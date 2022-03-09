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

const bnsf = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let detail = {
    container: {},
  };
  let loadedDetail;
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
      //   console.log(req.resourceType());
      if (["image"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(
      "https://custidp.bnsf.com/bnsfauth/LoginPage?am-level=1&am-url=https%3A%2F%2Fcustidp.bnsf.com%2Fsps%2Fbnsfcustidp%2Fsaml20%2Flogininitial%3FRequestBinding%3DHTTPPost%26PartnerId%3Dhttps%3A%2F%2Fsp.bnsf.com%2Fsps%2Fbnsfsp%2Fsaml20%26Target%3Dhttps%253A%252F%252Fwww.bnsf.com%252Fbnsf.was6%252Fdill%252Frprt")
    await navigationPromise;
    await page.waitForSelector(".form-signin");
    await page.waitForSelector("#userid");
    await page.waitForTimeout(2000);
    // Login Cred
    await page.type("input[name=userid]", portUsername, {
      delay: 100,
    });
    //    await  page.keyboard.press(String.fromCharCode(13))

    // await page.waitForTimeout(1 * 2000);
    // await page.waitForSelector("#idpSelect-bnsfcust");
    // await page.waitForSelector("#userid");
    //   await page.$eval(
    //   'input[value="bnsfcust"]',
    //   (check) => (check.checked = true)
    // );
    // await page.click("button[name=submitButton]");

    // await page.waitForTimeout(1 * 2000);
    await page.type("input[name=password]", portPassword, {
      delay: 100,
    });
    await page.click("button[type=submit]");
    // // Wait for logged page
    await page.waitForTimeout(5000);
    // await page.waitForSelector("iframe");
    let failedLogin = await page
      .evaluate(async () => {
        //page.goto(currentPageUrl);
        const final = !!document.querySelector(".error-text");
        return final;
      });
        if (failedLogin) {
          detail.container.caution = true;
          detail.container.message = error.loginError;
          await browser.close(); 
          return getResponseValues(detail.container);
        }

    await page.waitForSelector("form");
    let ctrNN = containerNo.split(/([0-9]+)/);
    ctrNN[1] = ctrNN[1].substring(0, 6);
    let ctrNbr = ctrNN[0] + ctrNN[1];
    // await page.waitForTimeout(2000);

    await page.type("textarea[name=equipment]", ctrNbr, {
      delay: 100,
    });

    await page.click("input[name=SubmitName]");

    // await page.click("input[value=Run]");
    await page.waitForTimeout(1 * 2000);
    await navigationPromise;
    await page.waitForSelector("form");
    loadedDetail = await page.evaluate(() => {
      let result = document.querySelector("tr#dllRowStyle");
      let container = {};
      if (result) {
        container.lastFreeDay =
          result.querySelector("td#LastFreeDay").innerText;

        container["UnitInit"] = result.querySelector("td#UnitInit").innerText;

        container["UnitNumber"] =
          result.querySelector("td#UnitNumber").innerText;
        container["ChassisInit"] =
          result.querySelector("td#ChassisInit").innerText;
        container["ChassisNumber"] =
          result.querySelector("td#ChassisNumber").innerText;
        container["DestHub"] = result.querySelector("td#DestHub").innerText;
        container["LastHub"] = result.querySelector("td#LastHub").innerText;
        container["BillYN"] = result.querySelector("td#BillYN").innerText;
        container["Lot"] = result.querySelector("td#Lot").innerText;
        container["Row"] = result.querySelector("td#Row").innerText;
        container["Spot"] = result.querySelector("td#Spot").innerText;
        container["LastFreeDay"] =
          result.querySelector("td#LastFreeDay").innerText;
        container["MissedPUFee"] =
          result.querySelector("td#MissedPUFee").innerText;
        container["EstDRMPDate"] =
          result.querySelector("td#EstDRMPDate").innerText;
        container["EstDRMPTime"] =
          result.querySelector("td#EstDRMPTime").innerText;

        container["PickupNumber"] =
          result.querySelector("td#PickupNumber").innerText;

        container["ApptDate"] = result.querySelector("td#ApptDate").innerText;

        container["ApptTime"] = result.querySelector("td#ApptTime").innerText;

        container["MateDate"] = result.querySelector("td#MateDate").innerText;

        container["MateTIME"] = result.querySelector("td#MateTIME").innerText;
        container["PreTrkrCHASSIS"] =
          result.querySelector("td#PreTrkrCHASSIS").innerText;
        container["InventoryStatus"] =
          result.querySelector("td#InventoryStatus").innerText;
        container["LGT"] = result.querySelector("td#LGT").innerText;
        container["TactETNDate"] =
          result.querySelector("td#TactETNDate").innerText;
        container["TactETNTime"] =
          result.querySelector("td#TactETNTime").innerText;
      }
      return container;
    });
    if (loadedDetail.LastFreeDay) {
      let ldat = moment.utc(loadedDetail.LastFreeDay, "MM/DD/YY");
      let dat = moment.tz(ldat, timeZone);
      dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
      detail.container.last_free_day = dat.toISOString();
    }
    // if (loadedDetail.EstDRMPDate) {
    //   let ldat = moment.utc(loadedDetail.EstDRMPDate, "MM/DD/YY");
    //   let dat = moment.tz(ldat, timeZone);
    //   dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
    //   detail.vesselEta = dat.toISOString();
    // }
    if (
      loadedDetail.InventoryStatus &&
      loadedDetail.InventoryStatus === "In Inv on Ground"
    ) {
      detail.container.status = "available";
    }
    // if (loadedDetail.ChassisNumber) {
    //   detail.chassisNo = loadedDetail.ChassisInit + loadedDetail.ChassisNumber;
    // }

    // detail.scac =
    // loadedDetail.Lot + " " + loadedDetail.Row + " " + loadedDetail.Spot;

    // detail.scac =
    //   (loadedDetail.Lot ? "Lot:" + loadedDetail.Lot + "," : "") +
    //   " " +
    //   (loadedDetail.Row ? "Row:" + loadedDetail.Row + "," : "") +
    //   " " +
    //   (loadedDetail.Spot ? "Spot:" + loadedDetail.Spot : "");

    if (Object.keys(detail.container).length <= 1) {
      detail.container.caution = true;
      detail.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(detail.container);
    }
    detail.container.caution = false;
    await browser.close();
    return getResponseValues(detail.container);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    detail.container.caution = true;
    detail.container.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(detail.container);
  }
};

module.exports = bnsf;
