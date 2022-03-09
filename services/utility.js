let request = require("request");
let AWS = require('aws-sdk');

const {
  PDFRStreamForBuffer,
  createWriterToModify,
  PDFStreamForResponse,
} = require("hummus");
const { WritableStream } = require("memory-streams");

const convertTMSStatusName = function (type_of_load, status) {
  if (type_of_load === "IMPORT") {
    if (status === "CHASSIS_PICKUP") {
      status = "Hook To Chassis";
    }
    if (status === "ENROUTE_PICKUP") {
      status = "Enroute to Pick Container";
    }
    if (status === "ARRIVED_PICKUP") {
      status = "Arrived at Pick Container";
    }
    if (status === "ENROUTE_DELIVERY") {
      status = "Enroute to Deliver Load";
    }
    if (status === "ARRIVED_DELIVERY") {
      status = "Arrived at Deliver Load";
    }
    if (status === "DELIVERED") {
      status = "Delivered";
    }
    if (status === "ENROUTE_RETURN") {
      status = "Enroute to Return Empty";
    }
    if (status === "ARRIVED_RETURN") {
      status = "Arrived at Return Empty";
    }
    if (status === "CHASSIS_TERMINATION") {
      status = "Returned";
    }
    if (status === "NEED_TO_DROP") {
      status = "Drop The Container";
    }
    if (status === "DROPPED") {
      status = "Dropped";
    }
    if (status === "NEED_TO_GET_DROP") {
      status = "Hook to Container";
    }
  } else if (type_of_load === "EXPORT") {
    if (status === "CHASSIS_PICKUP") {
      status = "Hook To Chassis";
    }
    if (status === "ENROUTE_PICKUP") {
      status = "Enroute to Pick Container";
    }
    if (status === "ARRIVED_PICKUP") {
      status = "Arrived at Pick Container";
    }
    if (status === "ENROUTE_DELIVERY") {
      status = "Enroute to Get Loaded";
    }
    if (status === "ARRIVED_DELIVERY") {
      status = "Arrived at Get Loaded";
    }
    if (status === "DELIVERED") {
      status = "Container is Loaded";
    }
    if (status === "ENROUTE_RETURN") {
      status = "Enroute to Return Load";
    }
    if (status === "ARRIVED_RETURN") {
      status = "Arrived at Return Load";
    }
    if (status === "CHASSIS_TERMINATION") {
      status = "Returned";
    }
    if (status === "NEED_TO_DROP") {
      status = "Drop The Container";
    }
    if (status === "DROPPED") {
      status = "Dropped";
    }
    if (status === "NEED_TO_GET_DROP") {
      status = "Hook to Container";
    }
  } else if (type_of_load === "ROAD") {
    if (status === "ENROUTE_PICKUP") {
      status = "Enroute to Pick Up";
    }
    if (status === "ARRIVED_PICKUP") {
      status = "Arrived at Pick Up";
    }
    if (status === "ENROUTE_DELIVERY") {
      status = "Enroute to Deliver Load";
    }
    if (status === "ARRIVED_DELIVERY") {
      status = "Arrived at Deliver Load";
    }
    if (status === "DELIVERED") {
      status = "Delivered";
    }
    if (status === "NEED_TO_DROP") {
      status = "Drop The Trailer";
    }
    if (status === "DROPPED") {
      status = "Dropped";
    }
    if (status === "NEED_TO_GET_DROP") {
      status = "Hook to Trailer";
    }
  }
  return status.toUpperCase();
};

const fetchRemoteFile = async (url) => {
  return new Promise((resolve, reject) => {
    request.get(url).on("response", (response) => {
      const body = "";
      let i = 0;
      const chunks = [];
      response.setEncoding("binary");
      response.on("data", (chunk) => {
        i++;
        chunks.push(Buffer.from(chunk, "binary"));
      });
      response.on("end", () => {
        const binary = Buffer.concat(chunks);
        let buffer = new Buffer.from(binary, "utf-8");
        resolve(buffer);
      });
    });
  });
};

const mergePdfs = (pdfBlobs) => {
  if (pdfBlobs.length === 0)
    throw new Error("mergePdfs called with empty list of PDF blobs");
  if (pdfBlobs.length === 1) return pdfBlobs[0];

  const [firstPdfRStream, ...restPdfRStreams] = pdfBlobs.map(
    (pdfBlob) => new PDFRStreamForBuffer(pdfBlob)
  );
  const outStream = new WritableStream();
  const pdfWriter = createWriterToModify(
    firstPdfRStream,
    new PDFStreamForResponse(outStream)
  );
  restPdfRStreams.forEach((pdfRStream) => {
    try {
      pdfWriter.appendPDFPagesFromPDF(pdfRStream);
    } catch (e) {}
  });
  pdfWriter.end();
  outStream.end();
  return outStream.toBuffer();
};

const emitSocketMessage = function (id, type, msg) {
  try {
    if (type === "statusChangeMessage") {
      const loadDetail = msg;
      const allCompletedStatus = loadDetail.statusOrder.filter((obj) => {
        return obj.isCompleted && obj.isActive;
      });
      const lastCompletedStatus =
        allCompletedStatus[allCompletedStatus.length - 1];
      let statusCompanyName = "";
      if (lastCompletedStatus && lastCompletedStatus.customerId) {
        statusCompanyName = lastCompletedStatus.customerId.company_name.substring(
          0,
          15
        );
      }
      const statusMessage = `${
        loadDetail.driver ? loadDetail.driver.name : ""
      } - Load #${
        loadDetail.reference_number
      }, Status Updated (${convertTMSStatusName(
        loadDetail.type_of_load,
        loadDetail.status === "NEED_TO_GET_DROP" && !loadDetail.isLive
          ? "DROPPED"
          : loadDetail.status
      ).substring(0, 25)} - ${statusCompanyName})`;
      const channelName = `${id}/${type}`;
      const data = { statusMessage, updatedAt: moment().toISOString() };
      if (loadDetail.terminal) {
        data.terminal = loadDetail.terminal;
      }
      firebase.database().ref(channelName).set(data);
    } else {
      if (msg && msg.routePath) {
        delete msg.routePath;
      }
      const channelName = `${id}/${type}`;
      firebase.database().ref(channelName).set(JSON.stringify(msg));
    }
  } catch (error) {
    console.error("emitSocketMessage", error, id, type, msg);
  }
};

const uploader =  (params) => {
  return new Promise((resolve, reject) =>{
    AWS.config = {
      accessKeyId: process.env.accessKeyId,
      secretAccessKey: process.env.secretAccessKey,
      region: 'us-west-2',
    };
    const s3BucketCustom = new AWS.S3({ params: { Bucket: process.env.bucket } });
  
   s3BucketCustom.putObject(params, (err, response) => {
      if (err) {
        callback(err);
      } else if (response.ETag) {
        resolve(response);
      }
    });
  })
}

exports.fetchRemoteFile = fetchRemoteFile;
exports.mergePdfs = mergePdfs;
exports.emitSocketMessage = emitSocketMessage;
exports.uploader = uploader;
