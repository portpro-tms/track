const axios = require('axios');
const moment = require('moment');
const getResponseValues = require("../common/getResponseValues");
const error = require("../common/errorMessage.json")
let log4js = require("log4js");
let logger = log4js.getLogger();
logger.level = "ALL";
const maherImportApi = async ({
    port,
    portUsername,
    portPassword,
    containerNo,
    timeZone,
}) => {
    let finalData = {
        container: {}
    }
    try {
        let availableStatus = ['yard', 'departed']
        let notAvailableStatus = ['inbound']
        // let token1 = await axios({
        //     url: 'https://mahercsp.maherterminals.com/cspgateway/rest/services/userService/loginUser',
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Content-Length': 70,
        //         Host: 'mahercsp.maherterminals.com',
        //         Origin: 'https://mahercsp.maherterminals.com',
        //         'User-Agent':
        //             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
        //     },
        //     data: {
        //         user: {
        //             username: 'WSANTOS',
        //             password: 'YZQRQAQV',
        //             requestData: []
        //         }
        //     },
        // });
        // 
        // let token = token1.headers.authorization
        // console.log(token);
        let yearNow = moment().year();
        let containerInfo = await axios({
            url: 'https://mahercsp.maherterminals.com/cspgateway/rest/services/containerService/getContainers',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': 70,
                Host: 'mahercsp.maherterminals.com',
                Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkYWI2MzIzOWRjNzU0YmVjODJhODBiZDUzZjUyYmE3OSIsImlhdCI6MTY0MjQyMDk2MywibmJmIjoxNjQyNDIwOTYzLCJzdWIiOiIiLCJleHAiOjE2NDI1MDczNjN9.qIPd3n4VqIxpy4aGvnTBh3m-iFvJIsv7xGSRGJlbpn4`,
                Origin: 'https://mahercsp.maherterminals.com',
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
            },
            data: {
                "user": {
                    "username": "WSANTOS",
                    "user_gkey": "800544",
                    "password": "YZQRQAQV",
                    "first_name": "Peggy",
                    "last_name": "Mecca",
                    "company_code": "M3271",
                    "company_scac": "MECA",
                    "company_name": "MECCA & SON TRUCKING CORP.",
                    "credit_status": "CHECK",
                    "trucker_vender_id": "Y",
                    "address_1": "580 LUIS MUNOZ MARIN BLVD",
                    "address_2": null,
                    "city": "JERSEY CITY",
                    "state": "NJ",
                    "zip": "07310",
                    "phone_number": "201-792-5866",
                    "fax_number": null,
                    "email_address": "DISPATCH.ORDERS@meccatrucking.com",
                    "active": "Y",
                    "expired_date": null,
                    "guarantee_limit": "0",
                    "role": "HAULIER",
                    "menuRoleArray": [
                        "CSP_PEEL_OFF_ROLE",
                        "CSP_TRUCKER_ENTRY_ROLE",
                        "CSP_TRUCKER_INQUIRY_ROLE"
                    ],
                    "passwordResetCode": null,
                    "canSeeAllData": "0",
                    "maherError": null,
                    "navisErrors": null,
                    "creditCard": null,
                    "device": "C",
                    "systemAdmin": null,
                    "callingCalculator": "N"
                },
                "requestData": [
                    {
                        "container": containerNo,
                    }
                ]
            }
        },
        );
        let finalDate;
        containerInfo.data.map(ltd => {
            let date = moment.tz(ltd['received_date'], timeZone);
            if (!(date.year() < yearNow) && ltd['category'] == "IMPRT") {
                finalDate = ltd['received_date'];
            }
        });
        let importData = containerInfo.data.find(
            (D) => D.category == "IMPRT" && D.received_date == finalDate
        );
        if (importData) {
            if (availableStatus.indexOf(importData['transit_state_description'].toLowerCase()) > -1) {
                finalData.container.status = 'available';
            }
            if (importData['fte_date']) {
                let dat = moment.tz(importData['fte_date'], timeZone);
                dat.add(moment(importData['fte_date']).tz(timeZone).utcOffset() * -1, "minutes");
                finalData.container.DATE_CHECK = dat.year();
                finalData.container.last_free_day = dat.toISOString();
            }
            if (importData['customs_released'] == '1') {
                finalData.container.custom = 'RELEASED'
            }
            if (importData['customs_released'] == '0') {
                finalData.container.custom = 'HOLD'
            }
            if (importData['freight_released'] == '1') {
                finalData.container.freight = 'RELEASED'
            }
            if (importData['freight_released'] == '0') {
                finalData.container.freight = 'HOLD'
            }
            if (notAvailableStatus.indexOf(importData['transit_state_description'].toLowerCase()) > -1) {
                finalData.container.status = 'not_available';
            }
        }
        if (importData) {
            importData.holdsArray.map(d => {
                if (d.code == 'FREIGHT RELEASE') {
                    finalData.container.freight = 'RELEASED'
                }
                if (d.code == 'CUSTOM RELEASE') {
                    finalData.container.custom = 'RELEASED'
                }
                if (d.code == 'NO FREIGHT RELEASE') {
                    finalData.container.freight = 'HOLD'
                }
                if (d.code == 'NO CUSTOM RELEASE') {
                    finalData.container.custom = 'HOLD'
                }
            })
        }
        if (finalData.container.custom == 'HOLD' && finalData.container.freight == 'HOLD') {
            finalData.container.status = 'not_available'
        }
        if (finalData.container.last_free_day) {
            if (finalData.container.DATE_CHECK < yearNow) {
                delete finalData.container.last_free_day;
                return getResponseValues(finalData.container);
            }
        }
        if (Object.keys(finalData.container).length <= 1) {
            finalData.container.caution = true;
            finalData.container.message = error.noDataError;
            return getResponseValues(finalData.container);
        }
        finalData.container.caution = false;
        return getResponseValues(finalData.container);
    } catch (err) {
        logger.error(`L4JS ${port} ${containerNo} ${err}`);
        finalData.container.caution = true;
        finalData.container.message = error.failedScrapeError;
        return getResponseValues(finalData.container);
    }
  
}


module.exports = maherImportApi;