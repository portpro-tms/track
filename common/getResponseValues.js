const getResponseValues = (values) => {
  var responseData = { container: {}, extraTracerData: {} };
  responseData.container.caution = values.caution;
  if (values.containerNo) {
    responseData.container.containerNo = values.containerNo;
  }

  if (values.hasOwnProperty("brokerHold")) {
    responseData.container.brokerHold = values.brokerHold;
  }

  if (values.message) {
    responseData.container.message = values.message;
  }

  //  lfd, status, freight, custom
  if (values.custom) {
    responseData.container.custom = values.custom;
  }
  if (values.freight) {
    responseData.container.freight = values.freight;
  }
  if (values.status) {
    responseData.container.status = values.status;
  }

  if (values.last_free_day) {
    responseData.container.last_free_day = values.last_free_day;
  }
  if (values.lastFreeDay) {
    responseData.container.last_free_day = values.lastFreeDay;
  }
  // End of lfd, status, freight, custom

  // for Bnsf
  if (values.scac) {
    responseData.container.scac = values.scac;
  }
  if (values.chassisNo) {
    responseData.container.chassisNo = values.chassisNo;
  }
  //

  // Extra Data
  if (values.scac) {
    responseData.extraTracerData.scac = values.scac;
  }
  if (values.chassisNo) {
    responseData.extraTracerData.chassisNo = values.chassisNo;
  }
  if (values.billingNbr) {
    responseData.extraTracerData.callerbillLandingNo = values.billingNbr;
  }

  if (values.consigneeName) {
    responseData.extraTracerData.consigneeName = values.consigneeName;
  }
  if (values.totalWeight) {
    responseData.extraTracerData.totalWeight = values.totalWeight;
  }

  if (values.weight) {
    responseData.extraTracerData.weight = values.weight;
  }

  if (values.distance) {
    responseData.extraTracerData.distance = values.distance;
  }

  if (values.height) {
    responseData.extraTracerData.containerHeightName = values.height;
  }

  if (values.size) {
    responseData.extraTracerData.containerSizeName = values.size;
  }

  if (values.type) {
    responseData.extraTracerData.containerTypeName = values.type;
  }
  if (values.vesselName) {
    responseData.extraTracerData.vesselName = values.vesselName;
  }

  if (values.vesselStatus) {
    responseData.extraTracerData.vesselStatus = values.vesselStatus;
  }

  if (values.vesselEta) {
    responseData.extraTracerData.eta = values.vesselEta;
  }
  if (values.containerOwnerName) {
    responseData.extraTracerData.containerOwnerName =
      values.containerOwnerName;
  }

  if (values.scac) {
    responseData.extraTracerData.scac = values.scac;
  }

  if (values.temperature) {
    responseData.extraTracerData.temperature = values.temperature;
  }

  if (values.hazmat) {
    responseData.extraTracerData.hazmat = values.hazmat;
  }
  if (values.liquor) {
    responseData.extraTracerData.liquor = values.liquor;
  }
  if (values.voyage) {
    responseData.extraTracerData.releaseNo = values.voyage;
  }

  if (values.appointmentNo) {
    responseData.extraTracerData.appointmentNo = values.appointmentNo;
  }
  if (values.containerOwnerName) {
    responseData.extraTracerData.containerOwnerName =
      values.containerOwnerName;
  }

  if (values.containerOwnerName) {
    responseData.extraTracerData.containerOwnerName =
      values.containerOwnerName;
  }

  if (values.notes) {
    responseData.extraTracerData.notes = values.notes;
  }
  if (values.carrier) {
    responseData.extraTracerData.carrierName = values.carrier;
  }
  if (values.carrierHold) {
    responseData.extraTracerData.carrierHold = values.carrierHold;
  }

  if (values.containerAvailableDay) {
    responseData.extraTracerData.containerAvailableDay =
      values.containerAvailableDay;
  }
  if (values.sealNo) {
    responseData.extraTracerData.sealNo = values.sealNo;
  }

  if (values.shipperName) {
    responseData.extraTracerData.shipperName = values.shipperName;
  }

  if (values.pickupNo) {
    responseData.extraTracerData.pickupNo = values.pickupNo;
  }
  if (values.carrierHold) {
    responseData.extraTracerData.carrierHold = values.carrierHold;
  }

  if (values.brokerHold) {
    responseData.extraTracerData.brokerHold = values.brokerHold;
  }

  if (values.info) {
    responseData.extraTracerData.notes = values.info;
  }

  if (values.extraTracerData) {
    responseData.extraTracerData = {
      ...responseData.extraTracerData,
      ...values.extraTracerData,
    };
  }
  return responseData;
};

module.exports = getResponseValues;
