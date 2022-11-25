import { resultsSettings, scrapeSettings, siteSettings } from "../scrapesettings";
const _ = require('lodash');
const https = require('https');


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

        if (siteSettings.type === 'api') {
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


        //sorting
        if (isJSON)
            returnData = _.orderBy(returnData, resultsSettings.sortColumn, resultsSettings.sortDirection);


        return { "success": true, "data": returnData };




    }
}