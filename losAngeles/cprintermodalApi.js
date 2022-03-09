const chromium = require("chrome-aws-lambda");
var randomip = require("random-ip");
const moment = require("moment");
require("moment-timezone");
const httpRequest = require("../common/httpRequest");
const csvToJSON = require("../common/csvtojson");
const error = require("../common/errorMessage.json");
let log4js = require("log4js");
let logger = log4js.getLogger();
const getResponseValues = require("../common/getResponseValues");
logger.level = "ALL";
let attempt = 0;
const formUrlEncoded = (x) =>
  Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");

const cprintermodal = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let finalData = {
    container: {},
  };
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
      delay: 100,
    });
    await page.type("input[name=password]", portPassword, {
      delay: 100,
    });
    await page.click("button[type=submit]");
    // // Wait for logged page
    await page.waitForTimeout(3000);

    let failedLogin = await page
    .evaluate(() => {
      let final = !!(document.querySelector('.error_msg'))
      return final;
    })
    .catch((err) => {
      logger.error(`L4JS Error ${err}`);
    });
    if (failedLogin) {
      finalData.container.caution = true
      finalData.container.message = error.loginError;
      await browser.close();
      return getResponseValues(finalData.container);
    }

    // Get All Cookies
    let cookies = await page.cookies();
    let SAP_SESSIONID_GP1_900,
      MYSAPSSO2,
      PDFAILOVERID,
      sapUsercontext,
      CPR_SESSION_ROUTING,
      PDSSESSIONID;

    cookies.forEach((cookie, i) => {
      if (cookie.name == "SAP_SESSIONID_GP1_900") {
        SAP_SESSIONID_GP1_900 = cookie.value;
      }
      if (cookie.name == "MYSAPSSO2") {
        MYSAPSSO2 = cookie.value;
      }
      if (cookie.name == "PD-FAILOVER-ID") {
        PDFAILOVERID = cookie.value;
      }
      if (cookie.name == "sap-usercontext") {
        sapUsercontext = cookie.value;
      }
      if (cookie.name == "CPR_SESSION_ROUTING") {
        CPR_SESSION_ROUTING = cookie.value;
      }
      if (cookie.name == "PD-S-SESSION-ID") {
        PDSSESSIONID = cookie.value;
      }
    });

    let cookie = `SAP_SESSIONID_GP1_900=${SAP_SESSIONID_GP1_900}; MYSAPSSO2=${MYSAPSSO2};  sap-usercontext=${sapUsercontext}; PD-FAILOVER-ID=${PDFAILOVERID}; CPR_SESSION_ROUTING=${CPR_SESSION_ROUTING}; PD-S-SESSION-ID=${PDSSESSIONID}`;
    // console.log(cookie);

    // await page.waitForSelector("iframe");
    const formDataa = {
      $filter: "companyContext eq '' and searchOption eq 'EQ'",
      search: containerNo,
      select:
        "fwdOrdrNmbr,eqpNmbr,equipmentTypeDescr,ldEmptyStatus,originLocDescr,destinationLocDescr,currentLocDescr,unitStatusDescription,eqpStatusDescr,loadShipmentStatusDescription,isGrounded,etaStr,vesselName,voyageNumber,storageGrntNmbr,pickupNmbr,shipperAddressName,consigneeAddressName,age,badOrder,bookingRefNmbr,CCN,eqpCheckDigit,detentionAge,ownerAddressName,isHazmat,TSLDLastFreeDay,offHire,operatorAddressName,pieces,portOfDischargeDesc,railCarID,TSLDAmount,TSLDAmountCurrency,trian,vbond,waybill,weight,weightUnit,currentLongitude,currentLatitude,companyContext,eqpmntNumber,eqpCheckDigit,waybill,bookingRefNmbr,portOfDischargeDesc,actualArrivalStr,etaStr,weight,weightUnit,badOrder,railCarID,equipmentTypeDescr,lastLocationDate,actualArrival,originLocCity,originLocRegion,destinationLocCity,destinationLocRegion,pickupnmbreditflag,storagegrntnmbreditflag,TSLDAmount,TSLDAmountCurrency,FwdOrdrViewFlag",
    };

    const options = {
      url:
        "https://www8.cpr.ca/sap/opu/odata/sap/ZIMCDP_CS_TTRACE_V2_SRV/TrackAndTrace?" +
        formUrlEncoded(formDataa),
      method: "get",
      headers: {
        // "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Cookie: cookie,
      },
    };

    let body = await httpRequest(options);
    if (body && body.data && body.data.d && body.data.d.results) {
      let detail = body.data.d.results[0];
      if (detail[`TSLDLastFreeDay`]) {
        let ldat = moment(detail[`TSLDLastFreeDay`], "DD-MM-YYYY");
        let dat = moment.tz(ldat, timeZone);
        dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
        finalData.container.last_free_day = dat.toISOString();
      }

      if (detail[`actualArrivalStr`]) {
        let ldat = moment(detail[`actualArrivalStr`]);
        let dat = moment.tz(ldat, timeZone);
        dat.add(moment(ldat).tz(timeZone).utcOffset() * -1, "minutes");
        finalData.container.vesselEta = dat.toISOString();
      }

      // Status
      if (detail[`eqpStatusDescr`] === 'Released') {
        finalData.container.status = "available";
      }
      // Status
      if (detail[`eqpStatusDescr`] === 'Waiting for Delivery') {
        finalData.container.status = "available";
      }

        // Custom Holds Status
      if (detail[`unitStatusDescription`]  === 'CANADA CUSTOMS') {
        finalData.container.custom = "HOLD";
      }
      let details={}
      for (const [key, value] of Object.entries(detail)) {
        if(key!=='__metadata' && key!=='Holds' && key!=='Events'){
          details[key]=value;     
        }
      }
      finalData.extraTracerData = details;
    }

    finalData.container.caution = false;
    if (Object.keys(finalData.container).length <= 1) {
      finalData.container.caution = true;
      finalData.container.message = error.noDataError;
      await browser.close();
      return getResponseValues(finalData.container);
    }

    await browser.close();
    return getResponseValues(finalData.container);
  } catch (e) {
    logger.error(`L4JS ${port} ${containerNo} ${e}`)
    finalData.container.caution = true;
    finalData.container.message = error.failedScrapeError;
    await browser.close();
    return getResponseValues(finalData.container);
  }
};

module.exports = cprintermodal;
