const axios = require('axios');
const { JSDOM } = require('jsdom')
import { scrapeSettings } from '../..//modules/scrapesettings';

export class scraper {
    site: string;
    settings: scrapeSettings;
    siteConfig: any;
    siteStrategy: any;
    constructor(site: string) {
        this.settings = new scrapeSettings();
        this.site = site;
        this.siteConfig = this.settings.getSiteConfig(site)
        this.siteStrategy = this.settings.getSiteStrategy(site)
    }

    // exclude = ['datetime', 'NOS op 3'];
    filtered(n) {
        let found = false;

        const exclude = this.settings.exclude('nos.nl');

        Object.keys(exclude).forEach(key => {
            if (n.indexOf(exclude[key] > -1)) {
                found = true;
            }
        });
        if (!found) {
            if ((n.match(/ /g) || []).length > 1) {
                return n;
            } else {
                return false;
            }
        } else {
            return false;
        }

    }
    metaData(node) {
        const { document } = new JSDOM(node.parentNode.parentNode.innerHTML).window
        return document.querySelector('a')?.toString() || null;

    }
    async news() {
        let response = await axios
            .get('https://feeds.nos.nl/nosnieuwsalgemeen', {
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
                },
                timeout: 5000
            });
        const html = response.data;

        const { document } = new JSDOM(html).window
        const nodeList = [...document.querySelectorAll('li span')];
        const domList = nodeList.map((node) => { return { title: this.filtered(node.innerHTML), data: this.metaData(node) } }).filter(txt => txt.title)
        if (domList)
            return domList;
        return null;
    }

    async scrape() {

        let response = await axios
            .get(this.siteConfig.url, {
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
                },
                timeout: 5000
            });
        const html = response.data;

        const { document } = new JSDOM(html).window
        console.log(document)
        const nodeList = [...document.querySelectorAll(this.siteStrategy.initialSelect)];
        const initialSelector = nodeList.filter((node) => { return node.innerHTML === this.siteStrategy.initialSelectInnerText });
        switch (this.siteStrategy.strategy) {
            case 'default':

                if (initialSelector) {
                    let childList;
                    if (this.siteStrategy.childSelect.indexOf(".") === 0) {
                        childList = document.getElementsByClassName(this.siteStrategy.childSelect.substring(1))
                    } else if (this.siteStrategy.childSelect.indexOf("#") === 0) {
                        childList = document.getElementsById(this.siteStrategy.childSelect.substring(1))
                    } else {
                        childList = document.getElementsByTagName(this.siteStrategy.childSelect)
                    }

                    let items = [...childList].map((child) => {
                        let title;
                        if (this.siteStrategy.titleSelector.indexOf(".") === 0) {
                            title = child.getElementsByClassName(this.siteStrategy.titleSelector.substring(1))[0]?.innerHTML;
                        } else if (this.siteStrategy.titleSelector.indexOf("#") === 0) {
                            title = child.getElementsById(this.siteStrategy.titleSelector.substring(1))[0]?.innerHTML;
                        } else {
                            title = document.getElementsByTagName(this.siteStrategy.titleSelector)
                        }
                        let metaParent
                        let metaTag
                        if (this.siteStrategy.initialMetaSelector.indexOf(".") === 0) {
                            metaParent = this.siteStrategy.initialMetaSelector.substring(1);
                            metaTag = child.getElementsByClassName(metaParent)[0]
                        }
                        else if (this.siteStrategy.initialMetaSelector.indexOf("#") === 0) {
                            metaParent = this.siteStrategy.initialMetaSelector.substring(1);
                            metaTag = child.getElementsById(metaParent)[0]
                        }
                        else {
                            metaParent = this.siteStrategy.initialMetaSelector;
                            metaTag = child.getElementsByTagName(metaParent)[0]
                        }
                        const meta = metaTag.getAttribute(this.siteStrategy.metaSelectorAttribute)
                        return { title: title, meta: meta }
                    })
                    return items;
                }
                else {
                    console.error(`Initial selector ${initialSelector} did not match for ${this.siteConfig.name}`)
                    return null;
                }
                break;
            default:
                return null;
        }


    }


    getElementBySelector(selector: string) {

    }
}