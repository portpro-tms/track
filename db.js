// const mongoose = require('mongoose');
// const models = require("./models");
let moment = require('moment');

const getSettings = async (db, _id) => {
  let userSettings = await db.models.User.findOne(
    { _id },
    {
      carrier: 1,
      invoiceLogo: 1,
      invoice_address: 1,
      profilePicture: 1,
      invoiceNote: 1,
      podNote: 1,
      rateConNote: 1,
    }
  ).populate({
    path: "carrier",
    model: "Carrier",
    select: {
      name: 1,
      lastName: 1,
      email: 1,
      invoiceLogo: 1,
      emailFrom: 1,
      emailBody: 1,
      emailSubject: 1,
      distanceMeasure: 1,
      weightMeasure: 1,
      company_name: 1,
    },
  }).lean()
  return userSettings;
};

const updateMultiLoad = async (db, ids) => {
  db.models.Load.updateMany({ _id: { $in: ids} }, { $set: { lastEmailSent: moment().toISOString() } }, { multi: true }).exec((err, doc) => {});
}

exports.getSettings = getSettings;
exports.updateMultiLoad = updateMultiLoad;
