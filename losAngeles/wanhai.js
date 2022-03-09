const chromium = require("chrome-aws-lambda");
const wanhai = async ({
  port,
  containerNo,
}) => {
  containerNo ? null:[() => {errors.containerNo = 'contianerNo is required in payload'}]  
  let isNotFound = false;
  let finalData = {};
  const errors = {}
  try {
  const browser = await chromium.puppeteer.launch({
    args: [...chromium.args],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
    stealth: true,
  });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      // console.log(req.resourceType());
      if (["image"].indexOf(req.resourceType()) > -1) {
        req.abort();
      } else {
        req.continue();
      }
    });
    let isNotFound = false;
    await page.goto('https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml?file_num=65580&parent_id=64738&top_file_num=64735', {waitUntill:'networkIdle2'})
    const selectedValueCheck = 'Ctnr No.'
    const selectedDropDown = await page.$$('#cargoType option[selected="selected"]');
    const isSelectedDropDown = selectedDropDown && selectedDropDown.length ?
     (selectedDropDown[0].getProperty('innerText') === selectedValueCheck) ?
      selectedDropDown[0].getProperty('innerText') : null : null;
    isSelectedDropDown ? null:[() => {errors.selectedDropDown = `${selectedValueCheck} not selected in main page`}]  
    const field1 = await page.$$('#q_ref_no1')
    if(field1 && !field1.length){errors.field1 = 'field1 not found'} 
    if(field1 && field1.length){
        await field1[0].type(containerNo,{delay:10});
    }
    await page.waitForTimeout(2000) 
    const queryBtn = await page.$$('#Query');
    queryBtn && queryBtn.length ? queryBtn[0].click() : [() => {errors.queryBtn = `queryBtn CTA not found`}];
    queryBtn && queryBtn.length ? queryBtn[0].click() : [() => {errors.queryBtn = `queryBtn CTA not found`}];
    // const scrapePage = await browser.waitForTarget(target => target.ur() === queryBtn[0].textContent());
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())))
    const scrapePage = await newPagePromise
    ThToFind = 'Ctnr Depot Name'
    //handle popup
    // const scrapePage = await allPages[allPages.length-1]; //switch page
    await scrapePage.on('dialog', async (dialog) => {
        isNotFound = true
        await dialog.dismiss()
        .then(() => {
            throw new Error('Data not found')
        })
        .catch(() => {
            // console.log(dialog.message());
            // return new Result(TestStatus.FAIL, dialog.message());
        });
    })

    if(Object.keys(errors).length){
        return {finalData,errors}
    }  
    await scrapePage.waitForTimeout(3000)
    if(isNotFound){errors.message = 'Data not found'} 
    if(typeof containerNo === 'string'){
        const tableHeadList = await scrapePage.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('#cargoTrackListBean > table > tbody > tr > th'))
            return tds.map(th => th.innerText)
        });
        const tableRow1List = await scrapePage.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('#cargoTrackListBean > table > tbody > tr > td'))
            return tds.map(td => td.innerText)
        });
        const colIndex = tableHeadList.findIndex(cell => cell === ThToFind);
        if(colIndex > -1){
            if(tableRow1List[colIndex]){
                finalData.empties = tableRow1List[colIndex];
            }else{
                errors.notFound = `${ThToFind} data not found`;
            }
        }
    }
    await browser.close();
    return {finalData,errors}
  } catch (e) {
    await browser.close();
    return finalData;
  }
};
module.exports = wanhai;
 