let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL"
const { JSDOM } = require('jsdom');
const httpRequest = require('../common/httpRequest');
const emptiesTerminal = async ({
    port,
}) => {
    try {
        const options = {
            url: 'https://www.apmterminals.com/en/port-elizabeth/practical-information/empty-container-return-policy',
            method: 'GET',
            headers: {
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
              // 'Accept-Charset': 'utf-8',
              Cookie: 'port-elizabeth#lang=en; ASP.NET_SessionId=wzaqusywtaw0mganh1uqxuuc; __RequestVerificationToken=zieiXSHfEZLIeeJ17rVx7FEoD4ZGN0e1pgb7uvEu5k6ByEWTWFO2hpLAp6odI6-OuSeT2YDcH15G2oVJEvFxP-eChpdrh-7Acl0S_FHnWA81; ARRAffinity=aac07ba7dd5c68c1e84340e2ab9868de44ccb72bc55d43945b6902c6f5c7910e; _delighted_fst=1571801253560:{}; SC_ANALYTICS_GLOBAL_COOKIE=ebf21332699b44a98c426cbd564c65b2|True; _ga=GA1.2.1482067596.1571801254; _gid=GA1.2.1332303768.1571895326; _delighted_lst=1571895586643:{%22token%22:%22cr2EsqA2uOgqcU5fNu0K9hPl%22}; _Privacy=1; _gat_UA-411907-4=1; ak_bmsc=50161A8579D3D40668C8E498C482934E6011965F7C300000C68AB15D3EBFC328~plTai3YkdmH0GM2ejWcb3HCN7X5CXBRViw/+35ivGyUdBP1IZ8YvTTakxwiY+6+CeOd4bvted/oLTVnHNj4Kokkg6fqADTViJba94s2DZyY9oXahr8Q6f92vM0L9uuFWIM3KlB21ZC3ScNeBXJTHV0HFjSdXWK6RnpxyC3dulZDi8iQoxKQ6zTOobqZtvEWoGGaekIOG9puSvN7Zd0ceRDvqw2n+dPVsCMvmveCt+BW+CEIWPaejma/+3wJ1iNHsqI',
              "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36"
            },
        };
    
        let body = await httpRequest(options);
        const htmlString = body.data;
        const { window } = new JSDOM(htmlString);
        const $ = require('jquery')(window);
        const tbl = $('#main > div:nth-child(3) > div:nth-child(1) > div > div > div > div:nth-child(1) > div.fixed-table__container > div > table').map(function () {
          return $(this).find('td').map(function () {
            return $(this).html();
          }).get();
        }).get();
        
        return tbl;
        
    } catch (error) {
        console.log(error)
        logger.error(`L4JS FOR PORT ${port} ${e}`)
    }

}

module.exports = emptiesTerminal;