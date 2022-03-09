const chromium = require("chrome-aws-lambda");
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");
var cheerio = require("cheerio");
const emodal = async ({
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
    await page.goto("https://ecp2.emodal.com/login");
    await page.waitForSelector(".form-group");
    await page.waitForSelector("#Username");
    await page.type("#Username", portUsername, {
      delay: 100,
    });
    await page.waitForSelector("#Password");
    await page.type("#Password", portPassword, {
      delay: 10,
    });
    await page.waitFor(1000);
    await page.$eval("#recaptcha-anchor", (check) => (check.checked = true));
    await page.click("#btnLogin");
    await page.waitFor(3000);

    finalData.container.containerNo = containerNo;
    // let url = `http://access.nwcontainer.com/EquipmentAvailability`;
    // await page.goto(url);
    // await page.waitForSelector("#content");
    // await page.waitForSelector("#ContentPlaceHolder1_txtEquipments");
    // await page.type("#ContentPlaceHolder1_txtEquipments", containerNo, {
    //   delay: 100,
    // });
    // await page.click("#ContentPlaceHolder1_btnSearch");

    // let loadedDetail = await page.evaluate(() => {
    //   let tds = document.querySelectorAll("table#grid1 tr.jqgrow td");
    //   let container = {};
    //   if (tds && tds.length > 0) {
    //     container.containerNo = tds[1].innerText;

    //     if (tds[3] && tds[3].innerText.toLowerCase() === "yes") {
    //       container.status = "available";
    //     } else {
    //       container.status = "not available";
    //     }

    //     if (tds[9] && tds[9].innerText.toLowerCase() == "released()") {
    //       container.custom = "RELEASED";
    //     }
    //     if (tds[9] && tds[9].innerText.toLowerCase() == "hold") {
    //       container.custom = "HOLD";
    //     }

    //     if (tds[10] && tds[10].innerText.toLowerCase() == "released") {
    //       container.freight = "RELEASED";
    //     }
    //     if (tds[10] && tds[10].innerText.toLowerCase() == "hold") {
    //       container.freight = "HOLD";
    //     }

    //     if (tds[15]) {
    //       container.last_free_day = tds[15].innerText;
    //     }
    //   }
    //   return container;
    // });
    // if (loadedDetail && loadedDetail.last_free_day) {
    //   let dat = moment.tz(loadedDetail.last_free_day, timeZone);
    //   dat.add(
    //     moment(loadedDetail.last_free_day).tz(timeZone).utcOffset() * -1,
    //     "minutes"
    //   );
    //   loadedDetail.last_free_day = dat.toISOString();
    // }

    // finalData.container = loadedDetail;
    await browser.close();
    return finalData;
  } catch (e) {
    await browser.close();

    return finalData;
  }
};

module.exports = emodal;
