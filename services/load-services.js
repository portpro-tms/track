const Utility = require('./utility');
const moment = require('moment');
const { PDFRStreamForBuffer, createWriterToModify, PDFStreamForResponse } = require('hummus');
require('moment-timezone');
const Q = require('q');

const newhtml = require("../newhtml");


const getDocuments =  (load, payload, settings) => {
  return new Promise(async (resolve, reject) =>{

  let totalAmount = 0,
    invoiceDate = "",
    deliveryDate = "",
    dueDate = "",
    pickupLocation = [],
    deliveryLocation = [],
    emptyDeposition = [],
    dontShowEmpty = false,
    showDash = false,
    agreementTime,
    billingDate,
    calculatedPricing= [],
    pickupRef = "",
    activeDriverName = "",
    lastFreeDay = "",
    freeReturnDate = "",
    pickupDate = "",
    bok,
    newDueDate,
    lastApproved,
    documentToGenerate = ["invoice"],
    allBuff = [],
    approvedDate;
  const partySignature = load.partySignature;
  if (load.driver) {
    activeDriverName = `${load.driver.name} ${load.driver.lastName}`;
  }
  if (load.callerPONo) {
    pickupRef = load.callerPONo;
  }
  if (load.type_of_load == "EXPORT") {
    bok = load.bookingNo;
  }
  if (load.type_of_load == "IMPORT") {
    bok = load.callerbillLandingNo;
  }

  if (load.pricing && load.pricing.length > 0) {
    load.pricing.forEach((price) => {
      const priceObj = {
        name: price.name,
        finalAmount: parseFloat(price.finalAmount).toFixed(2),
      };
      if (price.description) {
        priceObj.description = price.description;
      }
      if (price.chargePerDay == 0) {
        priceObj.unit = 1;
        priceObj.rate = "";
      } else {
        priceObj.unit = price.unit
          ? price.unit
          : price.finalAmount / price.chargePerDay;
        priceObj.rate = price.chargePerDay;
      }
      calculatedPricing.push(priceObj);
    });
  }
  if (load.carrier.email == "natalie.andriolo@interatlaslogistics.com") {
    calculatedPricing = calculatedPricing.map((D) => {
      if (atlasData[D.name]) {
        D.name = atlasData[D.name];
      }
      return D;
    });
  }
  if (load.type_of_load == "IMPORT") {
    load.shipper.forEach((obj) => {
      if (obj) {
        pickupLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
    load.consignee.forEach((obj) => {
      if (obj) {
        deliveryLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
    if (load.emptyOrigin) {
      emptyDeposition.push({
        address: load.emptyOrigin.address.address,
        company_name: load.emptyOrigin.company_name,
      });
    }
  }
  if (load.type_of_load == "EXPORT") {
    showDash = true;
    load.shipper.forEach((obj) => {
      if (obj) {
        pickupLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
    load.consignee.forEach((obj) => {
      if (obj) {
        deliveryLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
    if (load.emptyOrigin) {
      emptyDeposition.push({
        address: load.emptyOrigin.address.address,
        company_name: load.emptyOrigin.company_name,
      });
    }
  }
  if (load.type_of_load == "ROAD") {
    dontShowEmpty = true;
    load.shipper.forEach((obj) => {
      if (obj) {
        pickupLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
    load.consignee.forEach((obj) => {
      if (obj) {
        deliveryLocation.push({
          address: obj.address.address,
          company_name: obj.company_name,
        });
      }
    });
  }
  const dateOfInvoice = load.statusHistory.forEach((data) => {
    if (data.newStatus == "BILLING") {
      invoiceDate = data.createdAt;
    }
  });
  if (
    load.deliveryTimes &&
    load.deliveryTimes[0] &&
    load.deliveryTimes[0].deliveryFromTime
  ) {
    deliveryDate = moment(load.deliveryTimes[0].deliveryFromTime)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (
    load.pickupTimes &&
    load.pickupTimes[0] &&
    load.pickupTimes[0].pickupFromTime
  ) {
    pickupDate = moment(load.pickupTimes[0].pickupFromTime)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (load.lastFreeDay) {
    lastFreeDay = moment(load.lastFreeDay)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (load.freeReturnDate) {
    lastFreeDay = moment(load.lastFreeDay)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (invoiceDate) {
    invoiceDate = moment(invoiceDate)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (load.pricing && load.pricing.length > 0) {
    load.pricing.forEach((obj) => {
      totalAmount += Number(obj.finalAmount);
    });
  }
  totalAmount = totalAmount.toFixed(2);

  if (approvedDate && approvedDate.length > 0) {
    lastApproved = moment(approvedDate[approvedDate.length - 1].createdAt)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("ll");
    newDueDate = moment(approvedDate[approvedDate.length - 1].createdAt)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .add(load.caller.payment_terms || 0, "days")
      .format("ll");
  }
  if (load.approvedDate) {
    lastApproved = moment(load.approvedDate)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("ll");
  }
  if (load.partyName === "undefined") {
    load.partyName = "";
  }
  if (load.timeIn) {
    load.timeIn = moment(load.timeIn)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (load.timeOut) {
    load.timeOut = moment(load.timeOut)
      .tz(load.carrier.carrier.homeTerminalTimezone)
      .format("lll");
  }
  if (load.carrier.email == "natalie.andriolo@interatlaslogistics.com") {
    let refs = load.reference_number.split("_");
    let { 1: ref } = refs;
    load.reference_number = ref;
  }
  const dataToSend = Object.assign(
    {},
    load,
    {
      newDueDate,
    },
    {
      lastFreeDay,
    },
    {
      freeReturnDate,
    },
    {
      approvedDate: lastApproved,
    },
    {
      pickupDate,
    },
    {
      totalAmount,
    },
    {
      invoiceDate,
    },
    {
      dueDate,
    },
    {
      deliveryDate,
    },
    {
      pickupLocation,
    },
    {
      deliveryLocation,
    },
    {
      emptyDeposition,
    },
    {
      showDash,
    },
    {
      dontShowEmpty,
    },
    {
      carrierEmail: load.carrier.email,
    },
    {
      showAmerican: load.carrier.email == "kpersaud@shipace.com" ? true : false,
    },
    {
      showYj:
        load.carrier.email == "amadocruz@yjlogisticsusa.com" ? true : false,
    },
    {
      showIcon:
        load.carrier.email == "adrianr@loyaltytransportcorp.com" ? true : false,
    },
    {
      showMeccaIcon:
        load.carrier.email == "mikep.mecca@meccatrucking.com" ? true : false,
    },
    {
      isErl: load.carrier.email == "steve@erltrucks.com" ? true : false,
    },
    {
      showZoeva:
        load.carrier.email == "khris@zoevalogistics.com" ? true : false,
    },
    {
      showInterModal:
        load.carrier.email == "jgamero@us1intermodal.com" ? true : false,
    },
    {
      showOnt: load.carrier.email == "hveras@ontimenj.com" ? true : false,
    },
    {
      showTotal:
        load.carrier.email == "bob@totalsourcelogistics.com" ? true : false,
    },
    {
      showKamino:
        load.carrier.email == "dispatch@kaminologistics.com" ? true : false,
    },
    {
      isNotAtlas:
        load.carrier.email == "natalie.andriolo@interatlaslogistics.com"
          ? false
          : true,
    },
    {
      isAtlas:
        load.carrier.email == "natalie.andriolo@interatlaslogistics.com"
          ? true
          : false,
    },
    {
      isNts: load.carrier.email.indexOf("ntransvcs.com") > -1 ? true : false,
    },
    {
      hideAxelainc:
        load.carrier.email.indexOf("axelainc.com") > -1 ? true : false,
    },
    {
      partySignature,
    },
    {
      agreementTime,
    },
    {
      billingDate,
    },
    {
      bok,
    },
    {
      calculatedPricing,
    },
    {
      isImport: load.type_of_load === "IMPORT",
    },
    {
      isRoad: load.type_of_load === "ROAD",
    },
    {
      isExport: load.type_of_load === "EXPORT",
    },
    {
      pickupRef,
    },
    {
      activeDriverName,
    },
    {
      invoiceLogo: settings.invoiceLogo,
    },
    {
      isRateConfirm: payload.isRateConfirm,
    },
    {
      invoice_address:
        settings.invoice_address && settings.invoice_address.address,
    }
  );
//   if (payload.type) {
//     documentToGenerate = [];
//     if (payload.type == "invoice") {
//       documentToGenerate = ["invoice"];
//     } else {
//       documentToGenerate = ["delivery"];
//     }
//   }
//   if (payload.isBundle) {
  let buff = await newhtml.compileHtml(dataToSend, `${payload.type ? payload.type: 'invoice'}.html`, "pdf");
//   async.eachOfSeries(documentToGenerate, (docs, i, asyncCallback) => {
    // await newhtml.compileHtml(body, `${body.type}.html`, "pdf");
    // getPdfFromLambda(Object.assign({}, dataToSend, { type: "invoice" }))
    //   // newhtml.compileHtml(dataToSend, `${docs}.html`, 'pdf')
    //   .then((buff) => {
        allBuff.push(buff);
        // if (documentToGenerate.length - 1 == i) {
          let emailObj = {
            from: settings.carrier.emailFrom,
            subject:
              payload.subject ||
              dynamicStringByLoadInfo(settings.carrier.emailSubject, load),
            html:
              payload.body ||
              dynamicStringByLoadInfo1(settings.carrier.emailBody, load),
          };
          let allLiveFiles = [];
          if (!payload.type || payload.due) {
            emailObj.load = load;
            emailObj.documents = allBuff.map((pdfs) => ({
              filename: `${load.reference_number} # -invoice.pdf`,
              content: new Buffer.from(pdfs, "utf-8"),
            }));
            if (load.documents) {
              load.documents.forEach((obj) => {
                if (obj.checked) {
                  allLiveFiles.push(Utility.fetchRemoteFile(obj.url));
                }
              });
            }
          }
          if (payload.type) {
            if (payload.isBundle) {
              const allDocuments = [];
              if (load.documents) {
                load.documents.forEach((obj) => {
                  if (obj.checked) {
                    allDocuments.push(Utility.fetchRemoteFile(obj.url));
                  }
                });
              }
              Q.all(allDocuments)
                .then((livePdfResponse) => {
                  allBuff = [...allBuff, ...livePdfResponse];
                  const pdfs = Utility.mergePdfs(allBuff);
                  return callback(null, pdfs);
                })
                .catch((err) => {});
            } else {
              callback(
                null,
                payload.base64 ? arrayBufferToBase64(allBuff[0]) : allBuff[0]
              );
            }
          } else {
            Q.all(allLiveFiles).then((livePdfResponse) => {
              allBuff = [...allBuff, ...livePdfResponse];
              const buffs = Utility.mergePdfs(allBuff);
              if (allBuff.length >= 2) {
                emailObj.mergePDF = [
                  {
                    filename: `LOAD #${load.reference_number}-invoice.pdf`,
                    content: new Buffer.from(buffs, "utf-8"),
                  },
                ];
              }
              if (payload.multiLoadInEmail === true) {
                emailObj.mergePDF = [
                  {
                    filename: `LOAD #${load.reference_number}-invoice.pdf`,
                    content: buffs,
                  },
                ];
                resolve({
                  doc: emailObj.mergePDF || emailObj.documents,
                  emailObj,
                })
  
              } else if (payload.mergeDownload === true) {
                callback(null, buffs);
              } else {
                if (buffs.length > 0) {
                  emailObj.mergePDF = [
                    {
                      filename: `LOAD #${load.reference_number}-invoice.pdf`,
                      content: new Buffer.from(buffs, "utf-8"),
                    },
                  ];
                }
                // notification.sendEmailToUser(
                //   "LOAD_DOCUMENT_INVOICE",
                //   Object.assign({}, emailObj, {
                //     cc: payload.cc,
                //   }),
                //   payload.email,
                //   (err, res) => {
                //     LoadModel.findOneAndUpdate(
                //       {
                //         reference_number: load.reference_number,
                //       },
                //       {
                //         lastEmailSent: moment().toISOString(),
                //       }
                //     ).exec((err, doc) => {
                //       services.MongoService.getLoadPopulatedData(
                //         "Load",
                //         { reference_number: load.reference_number },
                //         {},
                //         {},
                //         (err, results) => {
                //           if (err) {
                //             callback(err);
                //           } else if (results && results.length > 0) {
                //             emitSocketMessage(
                //               results[0].carrier._id,
                //               "lastUpdatedLoad",
                //               results[0]
                //             );
                //           }
                //         }
                //       );
                //     });
                //     if (callback) callback(null, load);
                //   }
                // );
              }
            });
          }
        // } else {
        //   asyncCallback();
        // }
    //   })
    //   .catch((error) => {
    //     console.error(error);
    //     callback(error);
    //   });
//   });
})
};

exports.getDocuments = getDocuments;
