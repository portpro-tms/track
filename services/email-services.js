let async = require('async');
const nodeMailerModule = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const transporter = nodeMailerModule.createTransport(smtpTransport({
    host: 'smtp.mandrillapp.com', // hostname
    secureConnection: true, // use SSL
    // service: 'gmail',
    service: 'Mandrill',
    port: 587, // port for secure SMTP
    auth: {
      user: process.env.user,
      pass: process.env.pass,
    },
}));


function sendMailViaTransporter(mailOptions, cb) {
    console.log(mailOptions)
    // const logger = services.LoggerService.winstonLogger;
    const removeAttachments = mailOptions.deleteAttachments;
    delete mailOptions.deleteAttachments;
    // if(process.env.NODE_ENV!=='staging'){
      transporter.sendMail(mailOptions, (error, info) => {
          console.log(error,info)
        if (removeAttachments) {
          if (Array.isArray(mailOptions.attachments)) {
            mailOptions.attachments.forEach((attachment) => {
              deleteFile(attachment.path);
            });
          } else {
            deleteFile(mailOptions.attachments.path);
          }
        }
      });
    // }

    cb(null, null); // Callback is outside as mail sending confirmation can get delayed by a lot of time
  }


const sendEmailToUser = function (emailType, emailVariables, emailId, callback, telematicsBody) {
    const cc = emailVariables.cc;
    delete emailVariables.cc;
    const mailOptions = {
      from: 'No Reply Alert <do-not-reply@axle.us>',
      to: emailId,
      cc,
      subject: null,
      html: null,
      headers: { 'X-MC-PreserveRecipients': true },
    };
    /*eslint-disable */
    async.series([
      function (cb) {
        switch (emailType) {
          case 'LOAD_DOCUMENT_INVOICE':
            // mailOptions.subject = configs.NotificationConfig.config.notificationMessages.rateConfirmation.emailSubject;
            // mailOptions.attachments = { path: `${__dirname}/../tms/rateConformation/${emailVariables}.pdf` };
            // mailOptions.deleteAttachments = true;
            if (emailVariables.from) {
              mailOptions.from = emailVariables.from;
            }
            if (emailVariables.subject) {
              mailOptions.subject = emailVariables.subject;
            } else {
              mailOptions.subject = 'Billing for Load #' + emailVariables.load.reference_number;

            }

            // mailOptions.html = renderMessageFromTemplateAndVariables(configs.NotificationConfig.config.notificationMessages.newShipmentRefer.emailMessage, emailVariables);
            if (emailVariables.html) {
              mailOptions.html = emailVariables.html;
            } else {
              mailOptions.html = `<p>Please review attached documents</p>`
            }

            mailOptions.attachments = emailVariables.mergePDF || emailVariables.documents; // emailVariables.documents;
            // mailOptions.deleteAttachments = false;

            break;
          default:
            // TODO add something for default?
            break;
          /* eslint-enable */
        }
        cb();
      }, function (cb) {
        // sgMail.send(mailOptions)
        //   .then((res) => {
        //     console.log('success');
        //     cb(null, res);
        //   })
        //   .catch((err) => {
        //     cb(err);
        //   })
        sendMailViaTransporter(mailOptions, (err, res) => {
            console.log(err);
          cb(err, res);
        });
      },
      // eslint-disable-next-line no-unused-vars
    ], (err, responses) => {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  };

  exports.sendEmailToUser = sendEmailToUser;