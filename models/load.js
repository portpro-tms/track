const mongoose = require('mongoose');
const moment = require('moment');

const loadSchema = new mongoose.Schema({
    reference_number: {
      type: String,
      required: true,
    },
    lastEmailSent: {
      type: Date,
      optional: true,
    },
  }, { timestamps: true, usePushEach: true });

  module.exports = mongoose.model('Load', loadSchema);