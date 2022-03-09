const mongoose = require('mongoose');

  const PrefferedSchema = new mongoose.Schema({
    abbreviation: { type: String, required: true },
    name: { type: String, required: true },
  }, { timestamps: true });

  const carrierSchema = new mongoose.Schema({
    company_name: { type: String, trim: true, index: true, default: null, sparse: true },
    country_code: { type: String },
    MCNumber: { type: Number },
    timezone: { type: String },
    isDeleted: { type: Boolean, default: false, required: true },
    registration_type: { type: Number, required: true, default: 0 }, // 0 for independent driver and 1 for carrier company
    image: { type: String, default: null },
    certificateOfInsurance: { type: String, default: null },
    w9: { type: String, default: null },
    authorityLetter: { type: String, default: null },
    layout_type: { type: Number, default: 1 },
    step: { type: Number, default: 1 },
    totalRating: { type: Number, default: 0 },
    usersRated: { type: Number, default: 0 },
    noOfTrucks: { type: Number, default: 0 },
    truckType: { type: Array, default: null },
    mobile: { type: Number, default: 0 },
    delivery_prefferred: [PrefferedSchema],
    pickup_prefferred: [PrefferedSchema],
    homeTerminalTimezone: { type: String, required: false },
    odometer: { type: String, required: false },
    logIncrements: { type: String, required: false },
    primaryCycle: { type: String, required: false },
    cargoType: { type: String, required: false },
    cycleRestart: { type: String, required: false },
    cycleRestBreak: { type: String, required: false },
    cycleShortHaulException: { type: String, required: false },
    fleet_allowEditAccount: { type: String, required: false },
    fleet_allowMessaging: { type: String, required: false },
    fleet_requireLocation: { type: String, required: false },
    USDOTNumber: { type: String, required: false },
    CMVpowerUnitNumber: { type: String, required: false },
    defaultAddress: {
      type: String,
      required: false,
    },
    billingEmail: {
      type: String,
      optional: true,
    },
    geofence: {
      center: { type: Array },
      polygon: { type: Array },
      zoom: { type: Number },
    },
    domainVerification: {
      type: Object
    },
    domainVerificationLink: { type: String },
    subDomainName: { type: String, optional: true },
    portMarket: { type: String, optional: true },
    emailFrom: { type: String, required: true, default: 'No Reply Alert <do-not-reply@axle.us>' },
    emailSubject: { type: String, required: true, default: 'Invoice #  @reference_number@ ' },
    emailBody: { type: String, required: true, default: '<p>Please find the above reference invoice(s) attached. Thank you for your business!</p>' },
    distanceMeasure: {
      type: String,
      required: true,
      default: 'mi'
    },
    weightMeasure: {
      type: String,
      required: true,
      default: 'lbs'
    }
  }, { timestamps: true });


module.exports = mongoose.model('Carrier', carrierSchema);