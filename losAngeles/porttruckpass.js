const chromium = require("chrome-aws-lambda");
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJson = require("../common/csvtojson");

const porttruckpass = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };

  var propertiesObject = {
    apiParams: { Container_Nbr: containerNo },
    foobar: moment().tz(timeZone).valueOf(),
    sgrdModel: {
      searchtext: "",
      page: 1,
      pageSize: "30",
      sortBy: "1",
      sortDirection: "asc",
      sortColumns: "",
    },
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
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto("https://www.porttruckpass.com/");
    await page.waitForSelector("#sub-container");
    await page.type("#txtUserName", portUsername, {
      delay: 10,
    });
    await page.type("#txtPassword", portPassword, {
      delay: 10,
    });
    await page.click("#btnLogin");

    await page.waitFor(1000);
    await page.goto(
      "https://www.porttruckpass.com:64455/TerminalInfo/TerminalNewIndex"
    );

    // await page.waitFor(3000);
    let cookies = await page.cookies();
    let DBANON, aspSessionId, VitUser, _ga, _gid, __ValidationTag;
    cookies.forEach((cookie, i) => {
      if (cookie.name == ".DBANON") {
        DBANON = cookie.value;
      }
      if (cookie.name == "ASP.NET_SessionId") {
        aspSessionId = cookie.value;
      }
      if (cookie.name == ".VitUser") {
        VitUser = cookie.value;
      }
      if (cookie.name == "_ga") {
        _ga = cookie.value;
      }
      if (cookie.name == "_gid") {
        _gid = cookie.value;
      }
      if (cookie.name == "__ValidationTag") {
        __ValidationTag = cookie.value;
      }
    });
    let _token = `.DBANON=${DBANON}; ASP.NET_SessionId=${aspSessionId}; .VitUser=${VitUser}; _ga=${_ga}; _gid=${_gid}; __ValidationTag=${__ValidationTag}`;


    const options = {
      url: `https://www.porttruckpass.com:64455/ImportAvailability/GetContainerInfoList`,
      method: "GET",
      headers: {
        "Content-Type": "application/json, text/plain, */*",
        Cookie: _token,
      },
      params: propertiesObject,
    };
    let body = await httpRequest(options);
    let data = body && body.data ? body.data : "";
    if (data) {
      let cContent = data.Content;
      // console.log(cContent);
      // let cContent = csvToJson(body && body.cContent ? body.cContent : "");

      finalData.container.containerNo = containerNo;
      if (cContent && cContent[0]["AvailableStatus"]) {
        if (
          cContent[0]["AvailableStatus"].toLowerCase().indexOf("available") > -1
        ) {
          finalData.container.status = "available";
        }
        if (
          cContent[0]["AvailableStatus"]
            .toLowerCase()
            .indexOf("not available") > -1
        ) {
          finalData.container.status = "not_available";
        }
        if (
          cContent[0]["AvailableStatus"].toLowerCase().indexOf("off-dock") > -1
        ) {
          finalData.container.status = "available";
        }
        if (
          cContent[0]["AvailableStatus"].toLowerCase().indexOf("unknown") > -1
        ) {
          finalData.container.status = "not_available";
        }
      }
      if (cContent && cContent[0]["LastFreeDate"]) {
        let dat = moment.tz(cContent[0]["LastFreeDate"], timeZone);
        dat.add(
          moment(cContent[0]["LastFreeDate"]).tz(timeZone).utcOffset() * -1,
          "minutes"
        );

        finalData.container.last_free_day = dat.toISOString();
      }
      if (cContent && cContent[0]["Holds"]) {
        if (cContent[0]["Holds"] == "DISCHHLD") {
          finalData.container.freight = "HOLD";
        }
        if (
          cContent[0]["Holds"] == "NONE" ||
          cContent[0]["Holds"] == "CLEARED"
        ) {
          finalData.container.freight = "RELEASED";
        }
      }
      if (cContent && cContent[0]["Customs Release Status"]) {
        if (cContent[0]["Customs Release Status"] == "DISCHHLD") {
          finalData.container.custom = "HOLD";
        }
        if (
          cContent[0]["Customs Release Status"] == "NONE" ||
          cContent[0]["Customs Release Status"] == "CLEARED"
        ) {
          finalData.container.custom = "RELEASED";
        }
      }
    }

    // console.log(finalData);
    await browser.close();
    return finalData;
  } catch (e) {
    await browser.close();

    return finalData;
  }
};

module.exports = porttruckpass;
