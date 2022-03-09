const chromium = require("chrome-aws-lambda");
var randomip = require("random-ip");

const moment = require("moment");
require("moment-timezone");

const httpRequest = require("../common/httpRequest");


let attempt = 0;

const cpadms = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };

  let current_year = moment().year();
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
      // console.log(req.resourceType());
      if (["image"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto("https://cpa-dms.com/webgate/", {
      slowMo: 250,
    });

    await page.waitForTimeout(3000);
    await page.waitForSelector("#ctl09");

    // Login Cred
    await page.type("#MainContent_UsernameText", portUsername, {
      delay: 10,
    });
    await page.type("#MainContent_PasswordText", portPassword, {
      delay: 10,
    });
    await page.click("#MainContent_LoginButton");
    // // Wait for logged page
    await page.waitForTimeout(5000);

    await page.goto("https://cpa-dms.com/webgate/UnitInquiry.aspx");

    // await page.waitForNavigation();
    await page.waitForTimeout(1 * 2000);
    // container No
    await page.type("#MainContent_UnitIDTxt", containerNo, {
      delay: 10,
    });

    await page.click(".btn");
    // // await page.waitForNavigation();
    await page.waitFor(1 * 5000);
    // console.log("results");
    await page.waitForSelector("#MainContent_UnitInquiryInfo");

    let loadedDetail = await page.evaluate(() => {
      let resultRows = document.querySelectorAll(
        "table#MainContent_UnitInquiryGridView tr"
      );
      let container = {};
      if (resultRows.length > 1) {
        let tds = resultRows[1].querySelectorAll("td");
        container.status =
          tds[0].innerHTML === "OUT" ? "not_available" : "available";
        container.scac = tds[2].innerHTML;
        container.last_free_day = tds[1].innerText.trim();
      }
      return container;
    });
    if (loadedDetail.last_free_day) {
      let ldat = moment(loadedDetail.last_free_day, "MM/DD/YYYY");
      let dat = moment.tz(ldat, timeZone);
      dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
      loadedDetail.last_free_day = dat.toISOString();
    }
    finalData.container = loadedDetail;
    finalData.container.containerNo = containerNo;
    await browser.close();
    return finalData;
  } catch (e) {
    console.log(e);
    await browser.close();
    return finalData;
  }
};

module.exports = cpadms;
