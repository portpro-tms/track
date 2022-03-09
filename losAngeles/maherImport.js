const error = require("../common/errorMessage.json")
var randomip = require("random-ip");
const chromium = require("chrome-aws-lambda");
const moment = require("moment");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const cheerio = require("cheerio");
const getResponseValues = require("../common/getResponseValues");


const maherImport = async ({
    port,
    portUsername,
    portPassword,
    containerNo,
    timeZone,
}) => { 
    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });

    let finalData = {
        container: {},
      };
    try {
        const page = await browser.newPage();
        page.setViewport({ width: 1366, height: 768 });
        await page.goto(`https://mobile.maherterminals.com/container-availability-details?number=${containerNo}`)
        await page.evaluate(async () => { location.reload(true) })
        await page.waitFor(5000);
        let getData = await page
            .evaluate(async () => {
                const final = document.querySelector("body").innerHTML;
                return final;
            })
        let $ = cheerio.load(getData);
        let statsTable = $('.container.results').map(function () {
          return $(this)
            .find("span")
            .map(function () {
              return $(this).text();
            })
            .get();
        })
          .get();
      for (let i = 0; i < statsTable.length; i++){
        if (statsTable[i].trim().toLowerCase() === "ready for pick-up") {
          finalData.container.status = 'available';
        }

        if (statsTable[i].trim().toLowerCase() === "not available") {
          finalData.container.status = 'not_available'
        }

        if (statsTable[i].trim() === "Customs Status:") {
          if (statsTable[i + 1] != '') {
            finalData.container.custom = statsTable[i + 1];
          }
        }
        
        if (statsTable[i].trim() === "Line Status:") {
          if (statsTable[i + 1] != '') {
            finalData.container.freight = statsTable[i + 1];
          }
        } 

      }

      if (statsTable[12]) {
        let ldat = moment(statsTable[12], "MM/DD/YYYY");
        let dat = moment.tz(ldat, timeZone);
        dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
        finalData.container.last_free_day = dat.toISOString();
    } 
      if (Object.keys(finalData.container).length <= 1) {
			finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container)
      };
      finalData.container.caution = false;
      await browser.close();
      return getResponseValues(finalData.container)
    } catch (err) {
      logger.error(`L4JS ${port} ${containerNo} ${e}`)
      finalData.caution = true;
      finalData.message = error.failedScrapeError;
      await browser.close();
      return getResponseValues(finalData.container);
    }
}


module.exports = maherImport;