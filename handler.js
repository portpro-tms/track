const losangeles = require("./losAngeles");
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const error = require("./common/errorMessage.json");

module.exports.scrap = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let body = JSON.parse(event.body);
  // Remove whitespaces from body.containerNo
  if (Array.isArray(body.containerNo)) {
    body.containerNo = body.containerNo.map((cN) => cN.replace(/\s/g, ""));
  } else {
    body.containerNo = body.containerNo.replace(/\s/g, "");
  }
  if (body.port.startsWith("trapac")) {
    let response = await losangeles.trapac(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (
    body.port.startsWith("everport") ||
    body.port.startsWith("pierce county terminal (everport)")
  ) {
    // await delay(3000);
    let response = await losangeles.etslink(body);
    // module.exports.scrap(event, context, callback);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("fenix")) {
    try {
      let response = await losangeles.fenix(body);
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(response),
      });
    } catch (error) {
      console.log(
        "fenix====================================",
        JSON.stringify(error)
      );
    }
  }
  if (losangeles.payloads.ytiPayload.indexOf(body.port) > -1) {
    let response = await losangeles.yusen(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  // if (body.port.startsWith('yti')) {
  //   let response = await losangeles.yti(body)
  //   callback(
  //     null,{
  //       statusCode: 200,
  //       body: JSON.stringify(response)
  //     })
  // }
  if (body.port.startsWith("tti")) {
    let response = await losangeles.tti(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("pier")) {
    let response = await losangeles.pieratideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("pct")) {
    let response = await losangeles.pcttideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("lbct")) {
    let response = await losangeles.lbct(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("its")) {
    let response = await losangeles.its(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (body.port.startsWith("iitsMulti")) {
    let response = await losangeles.itsMulti(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (body.port.startsWith("wbct")) {
    let response = await losangeles.wbct(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  //OICT
  if (body.port.startsWith("oict")) {
    let response = await losangeles.oict(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (
    body.port.startsWith("vig") ||
    body.port.startsWith("nit") ||
    body.port.startsWith("norfolk")
  ) {
    let response = await losangeles.propassav(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  
  if (body.port.startsWith("tmxBarbour")) {
    let response = await losangeles.bayPortTerminal(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (
    body.port.startsWith("barbours cut terminals") ||
    body.port.startsWith("bayport terminal")
  ) {
    let response = await losangeles.cspPoha(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (
    body.port.toLowerCase() == "cn" ||
    body.port.startsWith("cn calgary") ||
    body.port.startsWith("cn brampton") ||
    body.port.startsWith("malport") ||
    body.port.startsWith("cn edmonton")
  ) {
    let response = await losangeles.ecprod(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (
    body.port.toLowerCase() == "cp" ||
    body.port.startsWith("cp calgary") ||
    body.port.startsWith("cp vaughan") ||
    body.port.startsWith("cp edmonton")
  ) {
    let response = await losangeles.cprintermodal(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("porttruckpass")) {
    let response = await losangeles.porttruckpass(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("rhct")) {
    let response = await losangeles.rhct(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  if (body.port.startsWith("bij")) {
    let response = await losangeles.bijtideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // if (body.port.startsWith("bayport terminal")) {
  //   let response = await losangeles.cpadms(body);
  //   callback(null, {
  //     statusCode: 200,
  //     body: JSON.stringify(response),
  //   });
  // }

  //Garden City Terminal
  if (body.port.startsWith("garden city terminal")) {
    let response = await losangeles.gaports(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  //Ocean Terminal
  if (body.port.startsWith("ocean terminal")) {
    let response = await losangeles.oceanTerminal(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // if (
  //   body.port.toLowerCase().startsWith("apmm") &&
  //   body.timeZone == "America/New_York"
  // ) {
  //   let response = await losangeles.apmNewYork(body);
  //   callback(null, {
  //     statusCode: 200,
  //     body: JSON.stringify(response),
  //   });
  // }

  // APM terminals
  if (
    losangeles.payloads.apmPayload.indexOf(body.port.toLowerCase()) > -1 &&
    body.timeZone == "America/Los_Angeles"
  ) {
    let response = await losangeles.apmTerminal(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // APM terminals New_York
  if (
    losangeles.payloads.apmPayload.indexOf(body.port.toLowerCase()) > -1 &&
    body.timeZone == "America/New_York"
  ) {
    let response = await losangeles.apmNewYork(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (body.port.toLowerCase().indexOf("pnct") > -1) {
    let response = await losangeles.pnct(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (
    "global".startsWith(body.port) ||
    "GLO".startsWith(body.port) ||
    "GLOBAL".startsWith(body.port) ||
    "gct bayonne".startsWith(body.port) ||
    "GCT BAYONNE".startsWith(body.port) ||
    "Global Bayonne (GCT)".startsWith(body.port)
  ) {
    let response = await losangeles.gcterminals(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  if (body.port.toLowerCase().indexOf("maher") > -1) {
    let response = await losangeles.maherImport(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // NW carriers
  // Terminal 18
  if (body.port.startsWith("terminal 18")) {
    let response = await losangeles.t18tideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  //FIT
  if (body.port.startsWith("fit")) {
    let response = await losangeles.fit(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  //pomtoc
  if (body.port.startsWith("pomtoc")) {
    let response = await losangeles.pmtoc(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  //everGlade
  if (body.port.startsWith("port everglades") || body.port.toLowerCase().startsWith("everglades")) {
    let response = await losangeles.everGlade(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  // Terminal 30
  if (body.port.startsWith("t30 terminal 30 - ssa seattle")) {
    let response = await losangeles.t30tideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  // Pierce County Terminal (Everport)
  // if (body.port.startsWith("pierce")) {
  //   let response = await losangeles.pctEverport(body);
  //   callback(null, {
  //     statusCode: 200,
  //     body: JSON.stringify(response),
  //   });
  // }

  // Washington United Terminal
  if (body.port.startsWith("wut washington united terminal marine")) {
    let response = await losangeles.wut(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // Husky Terminal
  if (body.port.startsWith("husky terminal & stevedoring")) {
    let response = await losangeles.htits(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // Terminal 6 Pop
  if (body.port.startsWith("terminal 6")) {
    let response = await losangeles.poptideworks(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  //Empties Apm
  if (body.port.startsWith("emptiesApm")) {
    let response = await losangeles.emptiesApm(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // // eModal
  if (body.port.startsWith("emodal")) {
    let response = await losangeles.emodal(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // Northwest Container Services
  if (body.port.startsWith("nwcs")) {
    let response = await losangeles.nwcs(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  //BNSF railway
  if (body.port.toLowerCase().startsWith("bnsf rail main")) {
    let response = await losangeles.bnsf(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }
  //wan hai
  if (body.port.toLowerCase().startsWith("wanhai")) {
    let response = await losangeles.wanhai(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  //NYCT
  if (
    body.port.toLowerCase().startsWith("gct new york") ||
    body.port.startsWith("nyct") ||
    body.port.startsWith("gct ny")
  ) {
    let response = await losangeles.nyct(body);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  // APM terminals Miami
  if (body.port.toLowerCase().startsWith("sfct")) {
    let response = await losangeles.sfct(body);
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  }

  callback(null, {
    statusCode: 404,
    body: JSON.stringify({
      container: { caution: true, message: error.failedScrapeError },
    }),
  });
};
