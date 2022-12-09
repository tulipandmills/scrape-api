const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan')

import { scraper } from './src/modules/scraper';
import { scrapeSettings } from './src/modules/scrapesettings';
import { searchService } from './src/modules/searchservice';
import { mongoService } from './src/modules/mongoservice';

let settings = new scrapeSettings();


const app = express();


morgan.token('params', req => {
    return JSON.stringify(req.params)
})

morgan.token('body', req => {
    return JSON.stringify(req.body)
})

app.use(morgan(':method :url :params'));



const port = 3000;
const search = new searchService();

app.use(cors());
app.all("*", (req, res, next) => {
    console.log('');
    console.log(`------${Date.now()}-----------`);
    next();
});


// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('Hello root!');
});

app.get('/search/:sites/:term', async (req, res) => {
    const sites = req.params.sites.split("|");
    let data = [];
    let headers = ['site'];
    let resultSettings = [];
    let ps = [];
    let splitIndex = 0;
    for (const site of sites) {
        ps.push(search.doSearch(req.params.term, site).then(r => {
            if (r.success) {

                //put settings to response
                resultSettings.push({ [site]: r.resultSettings });


                //put data to response
                if (r.data.length > 0) {
                    r.data.forEach(element => {
                        if (Array.isArray(element)) {
                            data.push(resultArrayToObject(element));
                        } else {
                            data.push(element);
                        }
                    });

                    if (splitIndex > data.length) {
                        splitIndex = data.length;
                    }

                    let siteHeaders = [];
                    //JSON type headers
                    try {
                        siteHeaders = Object.keys(data[splitIndex]);
                    } catch (err) {
                        console.error(err)
                    }
                    if (typeof (siteHeaders) === 'undefined' || siteHeaders.length === 0 || siteHeaders[0] === '0') {
                        siteHeaders = Object.keys(data[splitIndex][0])
                        if (typeof (siteHeaders) === 'undefined' || siteHeaders.length <= 1 || siteHeaders[0] === '0') {
                            //XML type headers
                            siteHeaders = [];
                            data[splitIndex].map((r: any, index) => {

                                const str = Object.keys(r)[index];
                                siteHeaders.push(typeof (str) === 'string' ? str : Object.keys(r)[0]);
                            })
                        }
                    }
                    if (siteHeaders.length === 1 && siteHeaders[0]?.length > 1) {
                        headers.push(siteHeaders[0]);
                    } else {
                        headers = [...headers, ...siteHeaders];
                    }


                    //make unique
                    let u: any = {};
                    headers.forEach(function (i: string) {
                        if (!u[i]) {
                            u[i] = true;
                        }
                    });
                    headers = Object.keys(u);

                    //Site specific result modifications
                    //Add the source as header and do field replaces
                    let siteSettings = settings.getResultSettings(site);
                    for (let i = splitIndex; i < data.length; i++) {
                        data[i]['site'] = site;
                        if (siteSettings?.fieldReplace) {
                            siteSettings.fieldReplace.forEach(r => {
                                if (data[i][r.key]) {
                                    data[i][r.key] = r.value.replace("$placeholder", data[i][r.key])
                                }
                            })
                        }
                    }
                    splitIndex = data.length + 1;
                } else {
                    console.log('No data for', site);
                }
            }
        }))
    }
    await Promise.all(ps).then(r => {
        console.log('Done');
    });

    res.send({ 'data': data, 'headers': headers, 'success': true, 'resultSettings': resultSettings })
});

const resultArrayToObject = (data) => {
    let o = {};
    data.map(function (item) {
        Object.assign(o, item)
    })
    return o;
}

app.get('/config', async (req, res) => {
    settings.loadConfigFile();
    console.log('Config file reloaded');
    res.send('Config file reloaded');
});

app.get('/sites/meta', async (req, res) => {
    console.log(`Sending meta data for all sites`);
    res.send(settings.getAllMeta());
});


app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));