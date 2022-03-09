const chromium = require("chrome-aws-lambda");
var randomip = require("random-ip");
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
let attempt = 0;

const etslink = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  // let finalData = {
  //   container: {},
  // };
  let finalDatas = [];
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
    // await page.setRequestInterception(true);

    // page.on('request', async(req) => {
    //   console.log(req.resourceType())
    //     if(['image'].indexOf(req.resourceType())> -1){
    //         req.abort();
    //     }
    //     else {
    //         req.continue();
    //     }
    //   })
    await page.goto("https://www.etslink.com", {
      slowMo: 250,
    });
    // await page.waitForNavigation();
    await page.waitForSelector("#loginPanel");
    await page.waitForSelector("#textfield-1010-inputEl");

    await page.type("#textfield-1010-inputEl", portUsername, {
      delay: 100,
    });
    await page.type("#textfield-1011-inputEl", portPassword, {
      delay: 100,
    });
    await page.click("#button-1016");

    await page.waitForTimeout(2000);
    let pageUrl = page.url();

    let _skVal = pageUrl.split("?")[1];

    await page.goto(
      "https://www.etslink.com/wimp/p003/WIMPP003.html?" + _skVal
    );

    // await page.waitForNavigation();
    await page.waitForTimeout(1 * 2000);

    await page.click("#tab-1157");
    await page.waitForSelector("#qry_byCntr-inputEl");

    // Container Numbers from Arrays

    let containerNos = containerNo.toString().split(",");
    containerNos = containerNos.toString().replace(/\,/g, "\r\n");

    await page.type("#qry_byCntr-inputEl", containerNos);
    await page.click("#tabCntrSearch");
    await page.click("#tabCntrSearch");

    const response = await page.waitForResponse(
      (response) =>
        response.url().includes("data/WIMPP003.queryByCntr.data.json?_dc=") &&
        response.status() === 200
    );
    let result = await response.json();
    if (result.success) {
      result.data.map((row) => {
        let container = {};
        let dat = moment.tz(row[28], timeZone);
        dat.add(moment(row[28]).tz(timeZone).utcOffset() * -1, "minutes");
        container.container_no = row[4];
        container.status =
          row[11].toLowerCase() === "yes" ? "available" : "not_available";
        container.custom =
          row[20].toLowerCase() === "release" ? "RELEASED" : "HOLD";
        container.freight =
          row[23].toLowerCase() === "no" ? "RELEASED" : "HOLD";
        container.brokerHold =
          row[24].toLowerCase() === "hold" ? true : false;
          
        container.last_free_day = dat.toISOString();
        finalDatas.push(container);
      });
    }
    await browser.close();
    return finalDatas;
  } catch (e) {
    finalDatas.failed = true;

    await browser.close();
    return finalDatas;
  }
};

module.exports = etslink;
