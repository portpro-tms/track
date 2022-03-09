const Fs = require("fs");
const Path = require("path");
const Util = require("util");
// const puppeteer = require("puppeteer");
const Handlebars = require("handlebars");
const moment = require("moment");
const chromium = require('chrome-aws-lambda');

const ReadFile = Util.promisify(Fs.readFile);

module.exports = {
  async compileHtml(infos, htmlfile, output) {
    const data = {
      result: infos,
    };
    const templatePath = Path.resolve(__dirname, "templates", htmlfile);
    const content = await ReadFile(templatePath, "utf8");
    // compile and render the template with handlebars
    Handlebars.registerHelper("formatDateFromNow", (datetime) => {
      if (datetime) {
        return moment(datetime).fromNow();
      }
      return datetime;
    });
    Handlebars.registerHelper("logoCarrier", (email) => {
      switch (email) {
        case "adrianr@loyaltytransportcorp.com":
          return "https://app.portpro.io/assets/images/loyalty_logo.jpeg";
        case "mikep.mecca@meccatrucking.com":
          return "https://app.portpro.io/assets/images/Mecca_logo.jpeg";
        case "dispatch@kaminologistics.com":
          return "https://app.portpro.io/assets/images/Kamino_logo.jpeg";
        default:
          return "https://app.portpro.io/assets/img/new-logo.png";
      }
    });
    const template = Handlebars.compile(content);
    if (output === "pdf") {
      const html = template(infos);
      const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
      const page = await browser.newPage();
      await page.setContent(html);
      let pdf = await page.pdf({
        printBackground: true,
      });
      page
        .evaluate(() => {
          while (1);
        })
        .catch((e) => void e);
      await page.waitFor(100);
      // try killing the page
      await page.close();
      await browser.close();
      return pdf;
    } else {
      const html = template(data);
      return html;
    }
  },
};
