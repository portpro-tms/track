const chromium = require("chrome-aws-lambda");
const error = require("../common/errorMessage.json");
const moment = require("moment");
require("moment-timezone");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
const csvToJSON = require("../common/csvtojson");
let attempt = 0;
const formUrlEncoded = (x) =>
  Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");

const ecprod = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let detail = {};
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
      if (["image", "stylesheet"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto("https://ecprod.cn.ca/cis/#/auth", {
      // slowMo: 250,
    });

    await page.waitForTimeout(2000);
    await page.waitForSelector(".ci-login-body");
    await page.waitForSelector("input[name=username]");

    // Login Cred
    await page.type("input[name=username]", portUsername, {
      delay: 10,
    });
    await page.type("input[name=password]", portPassword, {
      delay: 10,
    });
    await page.click("button[type=submit]");
    // // Wait for logged page
    await page.waitForTimeout(2500);

    try {
      let failedLogin = await page.evaluate(() => {
        let final = !!document.querySelector(
          ".ci-communication-message-warning"
        );
        return final;
      });
      // .catch((err) => {
      //   console.log(err)
      //   logger.error(`L4JS Error ${port} ${containerNo} ${err}`);
      // });
      if (failedLogin) {
        detail.caution = true;
        detail.message = error.loginError;
        await browser.close();
        return getResponseValues(detail);
      }
    } catch (err) {
      console.log(err);
    }
    // await page.waitForNavigation();
    await page.waitForTimeout(2000);
    let ctrNN = containerNo.split(/([0-9]+)/);
    ctrNN[1] = ctrNN[1].substring(0, 6);
    let ctrNbr = ctrNN[0] + ctrNN[1];

    let cookies = await page.cookies();

    let cookieVal = "";
    cookies.forEach((cookie, i) => {
      cookieVal = cookieVal + cookie.name + "=" + cookie.value + "; ";
    });
    const formDataa = {
      LANGUAGE: "E",
      version: "SID-1.0",
      LAST_IS_LEGACY: false,
      REF_TYPE_CODE: "HR",
      cars: ctrNbr,
      RESPONDBY: "XLS",
      REQUEST: "Submit",
    };

    const options = {
      url: "https://ecprod.cn.ca/velocity/IMShipmentStatus/english/CFF_ImdShipmentStatus",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        Cookie: cookieVal,
      },
      data: formUrlEncoded(formDataa),
    };

    let body = await httpRequest(options);
    // console.log(body.data);
    let data = csvToJSON(body.data);
    // console.log(data);

    let container = {};
    container.caution = false;
    if (data && data.length > 0 && data[0]) {
      let cValue = data[0];
      if (!cValue["Initials"].includes("No data found")) {
        // lfd
        if (cValue["1st Storage Date"]) {
          container.last_free_day = cValue["1st Storage Date"];
        }
        // Custom
        if (cValue["Customs"] && cValue["Customs"].includes("In Bond")) {
          container.custom = "HOLD";
        } else {
          container.custom = "RELEASED";
        }
        // Freight
        if (cValue["Steamship"] && cValue["Steamship"].includes("Hold")) {
          container.freight = "HOLD";
        }

        // status
        if (cValue["Load"] && cValue["Event"]) {
          let loadEvent = cValue["Load"] + " " + cValue["Event"];
          if (
            loadEvent.includes("Load Deramped") &&
            container.custom === "RELEASED"
          )
            container.status = "available";
        }
        if (container.custom === "HOLD") {
          container.status = "not_available";
        }
      } else {
        container.caution = true;
        container.message = error.noDataError;
      }
    }

    if (container.last_free_day) {
      // Add year to the date because only month and date is provided
      if (container.last_free_day.includes("Jan")) {
        current_year = "2022";
      }
      let datt = container.last_free_day + " " + current_year;

      if (datt) {
        datt = datt.replace(/\s/g, "/");
        let dattt = moment(datt, "DD/MMM/YYYY").endOf("day");
        // let day= dattt.format('dddd');
        // if(day==='monday'){
        //   dattt=dattt.subtract(3, 'd');
        // }
        // Subtract a day
        dattt = dattt.subtract(1, "d");
        container.last_free_day = moment(dattt).tz(timeZone).toISOString();
      }
    }

    if (container && container.last_free_day == "") {
      delete container.last_free_day;
    }

    detail = { ...container };
    if (Object.keys(detail).length <= 1) {
      detail.caution = true;
      detail.message = error.noDataError;
      await browser.close();
      return getResponseValues(detail);
    }
    await browser.close();
    return getResponseValues(detail);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`);
    await browser.close();
    detail.caution = true;
    detail.message = error.failedScrapeError;
    return getResponseValues(detail);
  }
};

module.exports = ecprod;
