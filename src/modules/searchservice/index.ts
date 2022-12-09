import { resultsSettings, scrapeSettings, siteSettings } from "../scrapesettings";
const _ = require('lodash');
const https = require('https');
const { JSDOM } = require('jsdom')
var convertXMLtoJS = require('xml-js');




export class searchService {
    settings = new scrapeSettings();
    constructor() {

    }

    private http_get_request = (url) => {
        return new Promise((resolve) => {
            let data = ''
            https.get(url, res => {
                res.on('data', chunk => { data += chunk })
                res.on('end', () => {
                    resolve(data);
                })
            })
        })
    }

    doSearch = async (term: string, site: string) => {
        const siteSettings: siteSettings = this.settings.getSiteConfig(site);
        const resultsSettings: resultsSettings = this.settings.getResultSettings(site);
        console.log('site settings', siteSettings);
        if (typeof (siteSettings?.url) === "undefined") {
            console.log(`Site ${site} was not configured`);
            return { "success": false };
        }
        let url_with_term = siteSettings.url;


        //TYPE API
        if (siteSettings.type === 'api' || siteSettings.type === 'html') {
            if (typeof (siteSettings.placeholder) !== 'undefined') {
                url_with_term = siteSettings.url.replace(siteSettings.placeholder, term);
            } else {
                console.log('No placeholder was set for ', site);
            }
        }

        let returnData;
        let isJSON = false;
        await this.http_get_request(url_with_term).then(
            (data: string) => {
                try {
                    returnData = JSON.parse(data);
                    isJSON = true;
                } catch {
                    returnData = data
                }

            }


        )

        //flattening
        if (siteSettings.dataPath && isJSON) {
            const dataPath = _.toPath(siteSettings.dataPath);
            if (dataPath.length > 0) {
                returnData = _.get(returnData, dataPath);
            }
        }

        //PARSE XML
        if (siteSettings.type === 'xml') {
            returnData = convertXMLtoJS.xml2json(returnData, { compact: true });


            try {
                returnData = JSON.parse(returnData);
                if (siteSettings.dataPath) {
                    const dataPath = _.toPath(siteSettings.dataPath);
                    if (dataPath.length > 0) {
                        returnData = _.get(returnData, dataPath);
                    }
                }
                isJSON = true;
            } catch (ex) {
                console.log(ex);
                return { success: false }
            }
        }

        //PARSE HTML
        if (siteSettings.type === 'html') {
            const _jsdom = new JSDOM(returnData);
            const $ = require('jquery')(_jsdom.window);

            const siteStrategy = this.settings.getSiteStrategy(site);
            const initialSelector = $("." + siteStrategy.initialSelectClass);



            if (typeof (initialSelector) !== 'undefined') {
                if (initialSelector.length === 0) {
                    console.log('Initial selector not found, might be 0 results')
                    return { 'success': true, "data": [] };
                }
                let childList;
                if (siteStrategy.childSelect.indexOf(".") === 0) {
                    childList = $(initialSelector).find(siteStrategy.childSelect)
                } else if (siteStrategy.childSelect.indexOf("#") === 0) {
                    childList = $(initialSelector).getElementsById(siteStrategy.childSelect.substring(1))
                } else {
                    childList = $(initialSelector.find(siteStrategy.childSelect))
                }

                let items = [];
                [...childList].map((child) => {
                    let title;
                    if (siteStrategy.titleSelector.indexOf(".") === 0) {
                        title = $(child).find(siteStrategy.titleSelector)?.html();
                    } else if (siteStrategy.titleSelector.indexOf("#") === 0) {
                        title = child.getElementsById(siteStrategy.titleSelector.substring(1))[0]?.innerHTML;
                    } else {
                        title = $().getElementsByTagName(siteStrategy.titleSelector)
                    }
                    if (typeof (title) === "undefined") {
                        console.log("title not found in ", site)
                        return;
                    }


                    let metaParent
                    let metaTag
                    if (siteStrategy.initialMetaSelector.indexOf(".") === 0) {
                        metaParent = siteStrategy.initialMetaSelector.substring(1);
                        metaTag = child.getElementsByClassName(metaParent)[0]
                    }
                    else if (siteStrategy.initialMetaSelector.indexOf("#") === 0) {
                        metaParent = siteStrategy.initialMetaSelector.substring(1);
                        metaTag = child.getElementsById(metaParent)[0]
                    }
                    else {
                        metaParent = siteStrategy.initialMetaSelector;
                        metaTag = child.getElementsByTagName(metaParent)[0]
                    }
                    let meta
                    try {
                        if (typeof (metaTag) !== "undefined") {
                            meta = metaTag.getAttribute(siteStrategy.metaSelectorAttribute)
                        } else {
                            console.log('metaData not found in ', site)
                            return;
                        }

                    } catch (ex) {
                        console.error(ex);
                    }

                    items.push({ title: title, meta: meta })
                })
                returnData = items;
            }
            else {
                console.error(`Initial selector ${initialSelector} did not match for ${site}`)
                returnData = null;
            }


            try {
                if (typeof (returnData) !== 'object') {
                    returnData = JSON.parse(returnData);
                }

                isJSON = true;
            } catch (ex) {
                console.log(ex);
                return { success: false }
            }
        }

        //sorting
        if (isJSON && resultsSettings?.sortColumn && resultsSettings.sortDirection)
            returnData = _.orderBy(returnData, resultsSettings.sortColumn, resultsSettings.sortDirection);

        //field mapping
        if (siteSettings.fieldMapFunction) {
            switch (siteSettings.fieldMapFunction) {
                case "takeFirstObjectValue":

                    returnData = _.map(returnData, function (r) {
                        return _.map(r, (value, index) => {
                            return { [index]: Object.values(value)[0] }
                        })
                    });
                    break;
            }
        }


        //initial filtering
        if (siteSettings.useTermAsInitialFilter) {
            returnData = _.filter(returnData, (data) => {
                let found = false;
                data.forEach((item: any) => {

                    if (Object.values(item)[0].toString().toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) > -1) {
                        found = true;
                    }


                })
                return found;
            });
        }

        return { "success": true, "data": returnData, "resultSettings": resultsSettings };




    }

} 