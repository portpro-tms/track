const mongoose = require('mongoose');
const async = require('async');
const bcrypt = require('bcrypt-nodejs');
const config = require('../config');


  const DeductionSchema = {
    name: {
      type: String
    },
    week: {
      type: Number
    },
    month: {
      type: Number
    },
    amount: {
      type: Number
    },
    weekTime: {
        type: Date
    },
    limit: {
      type: Number
    },
    remainAmount: {
      type: Number
    },
    disable: {
      type: Boolean,
      default: false
    }
  }
  const reportSchema = {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    fields: {
      type: [String],
      required: true,
    },
    time: {
      type: String,
      optional: true,
    },
    email: {
      type: String,
      optional: true,
    },
    isSendEmail: {
      type: Boolean,
      default: false,
    },
    cron_job_id: {
      type: String,
      optional: true,
    },
    duration: {
      type: String,
      optional: true,
    },
    customers: {
      type: [String],
      optional: true,
    },
    timePattern: {
      type: String,
      optional: true,
    },
    isMain: {
      type: Boolean,
      default: false,
    },
  };

const userSchema = new mongoose.Schema({
    username: { type: String, trim: true, index: true, sparse: true, optional: true },
    name: { type: String, trim: true, index: true, default: null, sparse: true },
    lastName: { type: String, trim: true, default: null },
    email: { type: String, trim: true, index: true, unique: true, required: false, sparse: true },
    password: { type: String, required: true },
    OTPCode: { type: String, required: false },
    referralCode: { type: String, default: '' },
    signUpReferral: { type: String },
    referralCreditAmount: { type: Number, default: 0 },
    appVersion: { type: String },
    isBlocked: { type: Boolean, default: false, required: true },
    isAdminRejected: { type: Boolean, default: false, required: true },
    isAdminVerified: { type: Boolean, default: true, required: true },
    isDeleted: { type: Boolean, default: false, required: true },
    isEmailVerified: { type: Boolean, default: false, required: true },
    isMobileVerified: { type: Boolean, default: false, required: true },
    policy: { type: String, default: '' },
    uniqueId: { type: String, default: null },
    work_number: { type: String, default: '', required: false },
    vApp: { type: String, default: '', required: false },
    os: { type: String, default: '', required: false },
    buildNo: { type: Number, default: 0, required: false },
    lastAppUsed: { type: Date, optional: true, },
    deviceToken: { type: String, default: '', required: false },
    code: { type: String, required: false },
    realmId: { type: String, required: false },
    qbCustomerRef: {
      type: String, required: false,
    },
    refresh_token: {
      type: String,
    },
    access_token: {
      type: String,
    },
    qbAccount: {
      type: String,
    },
    acl: {
      type: [String],
      optional: true,
    },
    isStatusNotificationShow: {
      type: Boolean,
      default: true,
      optional: true,
    },
    qbConnection: {
      type: Boolean,
      default: false,
      optional: true,
    },
    permissions: {
      type: [String],
      optional: true,
    },
    groupChats: {
      type: [String],
      default: [],
      optional: true,
    },
    reports: {
      type: [reportSchema],
      optional: true,
    },
    rossumWorkSpace: {
      type: String,
      optional: true,
    },
    queue: {
      type: String,
      optional: true,
    },
    qbDesktop: {
      type: Boolean,
      optional: true
    },
    invoiceLogo: { type: String },
    invoice_address: {
      address: { type: String, optional: true },
      lat: { type: Number, optional: true },
      lng: { type: Number, optional: true },
      city: { type: String, optional: true },
      state: { type: String, optional: true },
      country: { type: String, optional: true },
      zip_code: { type: String, optional: true },
    },
    profilePicture: { type: String },
    agentToken: {
      type: String,
      optional: true
    },
    companyID: {
      type: String,
      optional: true
    },
    endpoint: {
      type: String,
      optional: true
    },
    isMailConnected: {
      type: Boolean,
      default: false,
    },
    driverPreferences: {
      type: Boolean,
      default: false,
    },
    isOnBoardingDone: {
      type: Boolean,
      default: false,
    },
    invoiceNote: {
      type: String,
      optional: true,
    },
    podNote: {
      type: String,
      optional: true,
    },
    rateConNote: {
      type: String,
      optional: true,
    }
  }, { timestamps: true }
);

userSchema.statics.generatePasswordHash = function (password, callback) {
    async.auto({
      salt(done) {
        bcrypt.genSalt(10, done);
      },
      hash: ['salt', function (results, done) {
        bcrypt.hash(password, results.salt, null, done);
      }],
    }, (err, results) => {
      if (err) {
        return callback(err);
      }

      callback(null, {
        password,
        hash: results.hash,
      });
    });
  };

module.exports = mongoose.model('User', userSchema);