const chromium = require("chrome-aws-lambda");
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");


function sliceIntoChunks(arr, chunkSize) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

const trapac = async ({ port, containerNo, timeZone }) => {
  const browser = await chromium.puppeteer.launch({
    args: [...chromium.args],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  let res = {
    container: {},
  };
  let finalDatas = [];
  var count = 0;
  try {
    let containerGrp = sliceIntoChunks(containerNo, 14);
    await page.goto(
      "https://losangeles.trapac.com/quick-check/?terminal=LAX&transaction=availability",
      {},
      {
        slowMo: 20,
      }
    );
    await page.waitFor(1 * 3000);
    
    await page.waitForSelector
    let producttype;
    try {
      await page.waitForSelector("#cn-accept-cookie", { timeout: 1000 });
      producttype = document.querySelector("#cn-accept-cookie").innerText;
    } catch (error) {
      producttype = "";
    }
    if (producttype) {
      await page.click("#cn-accept-cookie");
    }

    await page.waitForSelector("#edit-containers");
    for (let index = 0; index < containerGrp.length; index++) {
      const containers = containerGrp[index];

      await page.evaluate(
        () => (document.getElementById("edit-containers").value = "")
      );
      await page.waitForTimeout(4000);
      // await page.focus("#edit-containers");
      let containerNos = containers.toString();
      await page.type("#edit-containers", containerNos, {
        delay: 10,
      });
      // await page.keyboard.type(containerNos);
      await page.click("#transaction-form > div.submit > button");
      await page.click("#transaction-form > div.submit > button");
      await page.waitForTimeout(4000);
      await page.waitForSelector("#transaction-detail-result");
      await page.waitForSelector("table");
      await page.waitForSelector(".row-odd");
      // Process Result Table
      let loadedDetail = await page.evaluate(() => {
        let alls = [];
        let result = document.querySelector("#transaction-detail-result");
        if (result) {
          let table = result.querySelector("table");
          let keyHeader = table.querySelectorAll(".th-second th");
          let valRows = table ? table.querySelectorAll(".row-odd") : [];
          for (i = 0; i < valRows.length; i++) {
            let container = {};
            let tds = valRows[i].querySelectorAll("td");
            if (tds.length > 0) {
              container.container_no = tds[1].innerText;
              let cbpa = false;
              let custom = false;
              let freight = false;
              let hold = true;
              let yardstatus = false;
              if (
                tds[3] &&
                tds[3].innerText.toLowerCase() != "n/a" &&
                tds[3].innerText.toLowerCase() == "released"
              ) {
                container.custom = "RELEASED";
                custom = true;
              }
              if (
                tds[3] &&
                tds[3].innerText.toLowerCase() != "n/a" &&
                tds[3].innerText.toLowerCase() == "hold"
              ) {
                container.custom = "HOLD";
              }
              if (
                tds[3] &&
                tds[3].innerText.toLowerCase() != "n/a" &&
                tds[3].innerText.toLowerCase() == "held"
              ) {
                container.custom = "HOLD";
              }
              if (
                tds[2] &&
                tds[2].innerText.toLowerCase() != "n/a" &&
                tds[2].innerText.toLowerCase() == "released"
              ) {
                container.freight = "RELEASED";
                freight = true;
              }
              if (
                tds[2] &&
                tds[2].innerText.toLowerCase() != "n/a" &&
                tds[2].innerText.toLowerCase() == "hold"
              ) {
                container.freight = "HOLD";
              }
              if (
                tds[2] &&
                tds[2].innerText.toLowerCase() != "n/a" &&
                tds[2].innerText.toLowerCase() == "held"
              ) {
                container.freight = "HOLD";
              }
              if (tds[6] && tds[6].innerText.toLowerCase() != "n/a") {
                container.last_free_day = tds[6].innerText;
              }

              // checking cbpa and hold for available status
              if (
                tds[4] &&
                tds[4].innerText.toLowerCase() != "n/a" &&
                tds[4].innerText.toLowerCase() == "released"
              ) {
                cbpa = true;
              }
              if (tds[8] && tds[8].innerText.toLowerCase() == "no") {
                hold = false;
              }

              if (
                tds[9] &&
                tds[9].innerText.toLowerCase().indexOf("in yard") > -1
              ) {
                yardstatus = true;
              }

              if (
                tds[5] &&
                tds[5].innerText.toLowerCase().indexOf("tmf hold") > -1
              ) {
                container.brokerHold = true;
              }else{
                container.brokerHold = false;
              }

              // if all holds are Released And Demurage hold is NO and yard status has in Yard the status is available
              if (yardstatus && !hold && cbpa && custom && freight) {
                container.status = "available";
              }
            }
            alls.push(container);
          }
        }
        return alls;
      });
      let finalData = loadedDetail.map((item) => {
        if (item.last_free_day) {
          let dat = moment.tz(item.last_free_day, timeZone);
          dat.add(
            moment(item.last_free_day).tz(timeZone).utcOffset() * -1,
            "minutes"
          );
          item.last_free_day = dat.toISOString();
        }
        count++;
        item.count = count;
        return item;
      });
      finalDatas = [...finalData, ...finalDatas];
    }
    await browser.close();

    return finalDatas;
  } catch (e) {
    finalDatas.failed = true;
    await browser.close();
    return res;
  }
};
module.exports = trapac;
