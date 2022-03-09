const chromium = require("chrome-aws-lambda");
var randomip = require("random-ip");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const moment = require("moment");
require("moment-timezone");
const error = require("../common/errorMessage.json")
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
let attempt = 0;

const voyagertrack = async ({
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

    if (portUsername == undefined || portPassword == undefined )  {
      logger.error(`L4JS ERROR WITH UNDEFINED VALUES PORTUSERNAME ${portUsername} && PORTPASSWORD ${portPassword} for ${port} and ${containerNo}`)
      finalData.container.message = error.loginError;
      finalData.container.caution = true;
      await browser.close();
      return getResponseValues(finalData.container);
    }

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
    await page.goto("https://voyagertrack.portsamerica.com/", {
      slowMo: 250,
    }).catch(err => {
      finalData.caution = 'Could not load port site! We will try again later!'
      logger.error(`L4JS ${port} ${containerNo} ${err}`)
      browser.close();
      return finalData;
    });

    await page.waitForTimeout(3000);
    await page.waitForSelector(".login-form");

    // Login Cred
    await page.type("#UserName", portUsername, {
      delay: 10,
    });
    await page.type("#Password", portPassword, {
      delay: 10,
    });
    await page.click("#btnLogonSubmit");
    // Wait for logged page
    await page.waitForTimeout(5000);

    let failedLogin = await page
    .evaluate(() => {
      const final = !!document.querySelector(
        ".validation-summary-errors"
      );
      return final;
    })
    .catch((err) => {
      logger.error(`L4JS Error ${err}`);
    });

    if (failedLogin) {
      finalData.container.caution = true;
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
    //  Wait for main Page
    await page.waitForSelector("#main");

    await page.goto(
      "https://voyagertrack.portsamerica.com/#/Report/ImportContainer/Inquiry?MainMenu=Report&InquiryType=ContainerNumber&ContainerNumber=" +
        containerNo +
        "&BillOfLadingNumber=&OnShip=true&OnShip=false&InYard=true&InYard=false&InLand=false"
    );

    // await page.waitForNavigation();
    await page.waitFor(1 * 2000);

    // await page.click("#tab-1157");
    await page.waitForSelector("#divImportContainerReport");

    let loadedDetail = await page.evaluate(() => {
      let container = {};
      let resultTable = document.querySelector("table tbody tr");
      if (resultTable) {
        let tds = resultTable.querySelectorAll("td");
        if (tds.length > 0) {
          container.container_no = tds[1].innerText;
          container.last_free_day = tds[12].innerText;
          let custom = tds[6].innerText;
          let freight = tds[7].innerText;

          if(custom ==='Released'){
            container.custom="RELEASED"
          }
          if(freight ==='Released'){
            container.freight="RELEASED"
          }
          if(custom ==='Hold'){
            container.custom="HOLD"
          }
          if(freight ==='Hold'){
            container.freight="HOLD"
          }


          if(tds[2] && tds[2].innerText && tds[2].innerText.toLowerCase().includes('yes')){
            container.status = 'available'
          }
          if(tds[2] && tds[2].innerText && tds[2].innerText.toLowerCase().includes('no')){
            container.status = 'not_available'
          }
          if(tds[2] && tds[2].innerText && tds[2].innerText.toLowerCase().includes('tmf hold') ){
            container.brokerHold = true
          }
          if(tds[2] && tds[2].innerText && tds[2].innerText.toLowerCase().includes('tmf rlsd') ){
            container.brokerHold = false
          }
          // container.freight = tds[7].innerText;
          // container.last_free_day = tds[12].innerText;
          // container.last_free_day = tds[12].innerText;
        }
      }

      return container;
    });
    // Format date
    let ldat = moment(loadedDetail.last_free_day, "MM/DD/YYYY");
    let dat = moment.tz(ldat, timeZone);
    dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
    loadedDetail.last_free_day = dat.toISOString();
    //
    finalData.container = loadedDetail;

    await browser.close();
    if (Object.keys(finalData.container).length <= 1) {
			finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
			return getResponseValues(finalData.container);
		}
    finalData.container.caution = false;
    return getResponseValues(finalData.container);
  } catch (e) {
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    await browser.close();
    return getResponseValues(finalData.container);
  }
};

module.exports = voyagertrack;
