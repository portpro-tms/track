
const moment = require("moment");
const error = require("../common/errorMessage.json")
const httpRequest = require("../common/httpRequest");
const getResponseValues = require("../common/getResponseValues");
require("moment-timezone");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const pnct = async (payload) => {
  let detail = {};
  try {
    // let payload = getFormValues(postData);
    const options = {
      url: `https://twpapi.pachesapeake.com/api/track/GetContainers?siteId=PNCT_NJ&key=${payload.containerNo}&_=1570071338501`,
      method: "GET",
    };

    let body = await httpRequest(options);
    if (body.status != 200) {
      detail.caution = true;
      detail.message = error.failedScrapeError;
      logger.error(`L4JS ${payload.port} ${payload.containerNo} ${body.status}`);
      return getResponseValues(detail);
    }
    if (body && body.data && body.data.length > 0) {
      let data = body.data[0];
      detail.containerNo = data.ContainerNumber;
      if (data.CustomReleaseStatus) {
        detail.custom = data.CustomReleaseStatus;
      }

      if (data.CarrierReleaseStatus) {
        detail.freight = data.CarrierReleaseStatus;
      }
      if(data.PaidThruDay){
        let dat = moment.tz(data.PaidThruDay, payload.timeZone);
        dat.add(
          moment(data.PaidThruDay).tz(payload.timeZone).utcOffset() * -1,
          "minutes"
        );
        detail.last_free_day = dat.toISOString();
      }else if (data.LastFreeDate) {
        let dat = moment.tz(data.LastFreeDate, payload.timeZone);
        dat.add(
          moment(data.LastFreeDate).tz(payload.timeZone).utcOffset() * -1,
          "minutes"
        );
        detail.last_free_day = dat.toISOString();
      }
      if (data.MiscHoldDetail == 'RELEASED') {
        detail.brokerHold = false;
      }
      // detail.brokerHold=data.MiscHoldDetail;
      detail.carrierHold=data.CarrierReleaseStatus;
      detail.carrier = data.CarrierName;
      detail.type = data.Type;
      detail.size = data.Length;
      detail.height = data.Height;
      detail.vesselName = data.VesselName;
      detail.voyage = data.VoyageNumber;
      detail.callerbillLandingNo = data.BillOfLadingNumber;
      detail.vesselEta = data.VesselArrivalTime;
      detail.totalWeight = data.GrossWeight;
      detail.sealNo = data.SealNumber;
      detail.shipperName = data.Shipper;
      detail.pickupNo = data.CallNumber;
      detail.temperature = data.TemperatureRequiredInFarenheit;

      if (data.AvailabilityDisplayStatus == "No") {
        detail.status = "not_available";
      }
      if (data.AvailabilityDisplayStatus == "Yes") {
        detail.status = "available";
      }

      // console.log(detail, "pnct~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    } else {
    detail.caution = "Container Not Found";
    }
    if (Object.keys(detail).length <= 1) {
      detail.caution = true;
      detail.message = error.noDataError;
      return getResponseValues(detail);
    }
    detail.caution = false;
    return getResponseValues(detail);
  } catch (e) {
    logger.error(`L4JS For PORT ${payload.port} CONTAINER ${payload.containerNo} ${e}`)
    detail.message = error.failedScrapeError;
    detail.caution = true;
    return getResponseValues(detail);
  }
};

module.exports = pnct;
