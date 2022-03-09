const generateTokenForApm = require("../common/generateTokenForApm");
const error = require("../common/errorMessage.json");
const getResponseValues = require("../common/getResponseValues");
const moment = require("moment");
moment.suppressDeprecationWarnings = true;
require("moment-timezone");
const axios = require("axios");
let log4js = require("log4js");
const httpRequest = require("../common/httpRequest");
let logger = log4js.getLogger();
logger.level = "ALL";


const apmTerminal2 = async ({
  port,
  portUsername,
  portPassword,
  containerNo,
  timeZone,
}) => {
  let terminalId= 22;
  
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  let dataa = generateTokenForApm();

   let body = await axios({
    url: "https://tops.apmterminals.com/api/TrackAndTrace/GetContainerAvailabiltyByTerm",
    method: "post",
    data: {
      searches: [
        {
          SearchId: 1,
          SearchName: "Import Availability - by Container #",
        },
        {
          SearchId: 2,
          SearchName: "Import Availability - by BL",
        },
        {
          SearchId: 3,
          SearchName: "Booking Enquiry",
        },
        {
          SearchId: 4,
          SearchName: "Vessel Schedule",
        },
        {
          SearchId: 5,
          SearchName: "Equipment History",
        },
        {
          SearchId: 6,
          SearchName: "Gate Transaction",
        },
      ],
      BookingNum: "",
      ContainerNumber: "",
      billoflanding_nbr: "",
      ImportcontainerNum: containerNo,
      Scheduletrip: "1",
      Ship: "",
      inVoyageCall: "",
      outVoyageCall: "",
      GateBookingNumber: "",
      GateBillNumber: "",
      GateContainerNumber: "",
      GateToDate: "07/08/2019",
      GateFromDate: "07/08/2019",
      Gkey: "",
      GateContainer: "",
      GateTruckEntered: "",
      ShippingLineIdVGM: "",
      ChargeType: "V",
      vShippingLineId: "",
      viewvgm: false,
      TerminalId: terminalId,
      terminals: [
        {
          TerminalId: 3,
          TerminalName: "Elizabeth",
          CompanyName: "US107ELZ",
          TaxIdNumber: "",
          ScheduleDKCode: "ELZ",
          ContactName: "",
          ContactDesignation: "",
          Extension1: "",
          PhoneNumber1: "",
          Fax: "",
          Address1: "",
          Address2: "",
          City: "",
          Country: "United States",
          State: "",
          Zip: "",
          UserId: 269,
          Status: false,
          Terminal_UNLocode_AN: null,
          Plant: "USFA",
          GeoCode: "USNWKSL",
          SalesOrg: "US56",
          Check_Pmt_FL: false,
          Guarantee_FL: false,
          Credit_Card_FL: false,
          Credit_Reserve_FL: false,
          DropDownDisplay: false,
          ElectronicCheck_FL: false,
          UseContainerDischargeAsFA: false,
          LogoId: null,
          CodeNameLocation: "Elizabeth",
        },
        {
          TerminalId: 22,
          TerminalName: "Los Angeles",
          CompanyName: "US05LSA",
          TaxIdNumber: "",
          ScheduleDKCode: "LSA",
          ContactName: "",
          ContactDesignation: "",
          Extension1: "",
          PhoneNumber1: "",
          Fax: "",
          Address1: "",
          Address2: "",
          City: "",
          Country: "United States",
          State: "",
          Zip: "",
          UserId: 269,
          Status: false,
          Terminal_UNLocode_AN: null,
          Plant: "USFM",
          GeoCode: "USLSATM",
          SalesOrg: "US52",
          Check_Pmt_FL: false,
          Guarantee_FL: false,
          Credit_Card_FL: false,
          Credit_Reserve_FL: false,
          DropDownDisplay: false,
          ElectronicCheck_FL: false,
          UseContainerDischargeAsFA: false,
          LogoId: null,
          CodeNameLocation: "Los Angeles",
        },
        {
          TerminalId: 6,
          TerminalName: "Miami",
          CompanyName: "US93SFC",
          TaxIdNumber: "",
          ScheduleDKCode: "SFC",
          ContactName: "",
          ContactDesignation: "",
          Extension1: "",
          PhoneNumber1: "",
          Fax: "",
          Address1: "",
          Address2: "",
          City: "",
          Country: "United States",
          State: "",
          Zip: "",
          UserId: 269,
          Status: false,
          Terminal_UNLocode_AN: null,
          Plant: "USFW",
          GeoCode: "USMIATM",
          SalesOrg: "US55",
          Check_Pmt_FL: false,
          Guarantee_FL: false,
          Credit_Card_FL: false,
          Credit_Reserve_FL: false,
          DropDownDisplay: false,
          ElectronicCheck_FL: false,
          UseContainerDischargeAsFA: false,
          LogoId: null,
          CodeNameLocation: "Miami",
        },
        {
          TerminalId: 27,
          TerminalName: "Mobile",
          CompanyName: "US70MCT",
          TaxIdNumber: "",
          ScheduleDKCode: "MOB",
          ContactName: "",
          ContactDesignation: "",
          Extension1: "",
          PhoneNumber1: "",
          Fax: "",
          Address1: "",
          Address2: "",
          City: "",
          Country: "United States",
          State: "",
          Zip: "",
          UserId: 269,
          Status: false,
          Terminal_UNLocode_AN: null,
          Plant: "USFP",
          GeoCode: "USMOB",
          SalesOrg: "US54",
          Check_Pmt_FL: false,
          Guarantee_FL: false,
          Credit_Card_FL: false,
          Credit_Reserve_FL: false,
          DropDownDisplay: false,
          ElectronicCheck_FL: false,
          UseContainerDischargeAsFA: false,
          LogoId: null,
          CodeNameLocation: "Mobile",
        },
      ],
    },
     headers: {
      "Content-Type": "application/json",
      Authorization: dataa,
      Cookie:
        "port-elizabeth#lang=en; ASP.NET_SessionId=wzaqusywtaw0mganh1uqxuuc; __RequestVerificationToken=zieiXSHfEZLIeeJ17rVx7FEoD4ZGN0e1pgb7uvEu5k6ByEWTWFO2hpLAp6odI6-OuSeT2YDcH15G2oVJEvFxP-eChpdrh-7Acl0S_FHnWA81; ARRAffinity=aac07ba7dd5c68c1e84340e2ab9868de44ccb72bc55d43945b6902c6f5c7910e; _delighted_fst=1571801253560:{}; SC_ANALYTICS_GLOBAL_COOKIE=ebf21332699b44a98c426cbd564c65b2|True; _ga=GA1.2.1482067596.1571801254; _gid=GA1.2.1332303768.1571895326; _delighted_lst=1571895586643:{%22token%22:%22cr2EsqA2uOgqcU5fNu0K9hPl%22}; _Privacy=1; _gat_UA-411907-4=1; ak_bmsc=50161A8579D3D40668C8E498C482934E6011965F7C300000C68AB15D3EBFC328~plTai3YkdmH0GM2ejWcb3HCN7X5CXBRViw/+35ivGyUdBP1IZ8YvTTakxwiY+6+CeOd4bvted/oLTVnHNj4Kokkg6fqADTViJba94s2DZyY9oXahr8Q6f92vM0L9uuFWIM3KlB21ZC3ScNeBXJTHV0HFjSdXWK6RnpxyC3dulZDi8iQoxKQ6zTOobqZtvEWoGGaekIOG9puSvN7Zd0ceRDvqw2n+dPVsCMvmveCt+BW+CEIWPaejma/+3wJ1iNHsqI",
    },
  })
  let response = new Object();
  let data = body.data.ContainerAvailabiltyByTerm;
  Array.prototype.push.apply(response, data)

  // console.log(response[0])

  let res = {
    container: {
      status: null,
      last_free_day: null,
      extraTracerData: {},
    },
  };

  try {
    if (response[0]) {
      if (
        response[0].READYFORDELIVERY.toLowerCase().indexOf(
          "yes"
        ) != -1
      ) {
        res.container.status = "available";
      } else {
        res.container.status = "not_available";
      }
      if (
        response[0].GOODTHRU &&
        response[0].GOODTHRU != ""
      ) {
        let dat = moment.tz(
          response[0].GOODTHRU,
          timeZone
        );
        dat.add(
          moment(response[0].GOODTHRU)
            .tz(timeZone)
            .utcOffset() * -1,
          "minutes"
        );
        res.container.last_free_day = dat.toISOString();
      } else {
        res.container.last_free_day = null;
      }
      if (
        response[0].FREIGHT &&
        response[0].FREIGHT != ""
      ) {
        res.container.freight =
        response[0].FREIGHT.replace(
            /(<([^>]+)>)/gi,
            ""
          );
      } else {
        res.container.freight = null;
      }
      if (
        response[0].CUSTOMS &&
        response[0].CUSTOMS != ""
      ) {
        res.container.custom =
        response[0].CUSTOMS.replace(
            /(<([^>]+)>)/gi,
            ""
          );
      } else {
        res.container.custom = null
      }
      if (response[0].GROSS_WEIGHT) {
        res.container.extraTracerData.totalWeight =
        response[0].GROSS_WEIGHT.replace(
            /(<([^>]+)>)/gi,
            ""
          );
      } else {
        res.container.extraTracerData.totalWeight = null;
      }
      if (response[0].WEIGHT) {
        res.container.extraTracerData.weight =
        response[0].WEIGHT;
      } else {
        res.container.extraTracerData.weight = null;
      }

      if (response[0].CONSIGNEE) {
        res.container.extraTracerData.consigneeName =
        response[0].CONSIGNEE.replace(
            /(<([^>]+)>)/gi,
            ""
          );
      } else {
        res.container.extraTracerData.consigneeName = null;
      }

      if (
        response[0]["CNTR SIZE"] &&
        response[0]["CNTR SIZE"] != ""
      ) {
        let types = response[0]["CNTR SIZE"].split("/");
        res.container.extraTracerData.containerSizeName = types[0];
        res.container.extraTracerData.containerTypeName = types[1];
        res.container.extraTracerData.containerHeightName = types[2];
      } 
      if (
        response[0]["VESSEL NAME"] &&
        response[0]["VESSEL NAME"] != ""
      ) {
        res.container.extraTracerData.vesselName =
        response[0]["VESSEL NAME"].replace(
            /(<([^>]+)>)/gi,
            ""
          );
      }
      if (
        response[0]["VESSEL ETA"] &&
        response[0]["VESSEL ETA"] != ""
      ) {
        res.container.extraTracerData.eta = response[0][
          "VESSEL ETA"
        ].replace(/(<([^>]+)>)/gi, "");
      }

      if (response[0].VESSELVOYAGE) {
        res.container.extraTracerData.releaseNo =
        response[0].VESSELVOYAGE.replace(
            /(<([^>]+)>)/gi,
            ""
          );
      }
      if (response[0]["SSL SCAC"]) {
        res.container.extraTracerData.scac = response[0][
          "SSL SCAC"
        ].replace(/(<([^>]+)>)/gi, "");
      }
    }
     else {
      res.container.caution = true;
      res.container.message = error.noDataError;
      return getResponseValues(res.container);
    }
    if (Object.keys(res.container).length <= 3) { 
      res.container.caution = true;
      res.container.message = error.noDataError;
      return getResponseValues(res.container);
    }
    res.container.caution = false;
    return getResponseValues(res.container);
  } catch (e) {
    console.log('errror',e)
    logger.error(`L4JS FOR PORT ${port} and CONTAINER ${containerNo} ${e} `)
    res.container.message = error.failedScrapeError;
    res.container.caution = true;
    return getResponseValues(res.container);
  }
};

module.exports = apmTerminal2;