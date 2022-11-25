import { Interface } from "readline";

const path = require('path');
const fsPromises = require('fs/promises');
const _ = require('lodash');

let settings;

export class scrapeSettings {
    getSiteSettings(site: string, datas: string[]): any {
        const sets = Object.entries(settings).filter(item => datas.indexOf(item[0]) > -1)
        const filtered = sets.map(item => {
            const key = item[0];
            const val = item[1][site];
            return { [key]: val }
        })
        return filtered || []
    }

    //now do getSiteSettings(site: string[], datas: string[]): any {
    //and accept for 'skipnotenabled' based on sites object and skip those in other selectors

    constructor() {
        this.loadConfigFile();
    }

    async loadConfigFile() {
        const filePath = '../../../config.json';
        const relativePath = path.join(__dirname, filePath);
        const data = await fsPromises.readFile(relativePath);
        settings = JSON.parse(data);
    }

    private _testSetting = 1;
    allSettingsAsJson() {
        return settings;
    }

    url(site: string) {
        return settings.sites[site]?.url || null;
    }
    exclude(site: string) {
        return settings.conditions[site]?.exclude || null;
    }

    getAllMeta() {
        return _.mapValues(settings.sites, (site, key) => {
            return { human: site.human || key }
        });
    }


    getSiteConfig(site: string) {
        return settings.sites[site] || null;
    }
    getSiteStrategy(site: string) {
        return settings.datastrategy[site] || null;
    }

    getResultSettings(site: string) {
        return settings.results[site] || null;
    }

}

export interface siteSettings {
    url: string
    type: string
    placeholder?: string,
    dataPath?: string,
    human?: string
}

enum directions {
    'asc',
    'desc'
}
export interface resultsSettings {
    sortColumn: string,
    sortDirection: directions
}