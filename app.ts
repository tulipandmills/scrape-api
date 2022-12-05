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
    let ps = [];
    for (const site of sites) {
        ps.push(search.doSearch(req.params.term, site).then(r => {
            if (r.success) {
                r.data.forEach(element => {
                    if (Array.isArray(element)) {
                        data.push(element);
                    } else {
                        data.push([element]);
                    }
                });
            }
        }))
    }
    await Promise.all(ps).then(r => {
        console.log('Done');
    });
    res.send({ 'data': data, 'success': true })
});


app.get('/newsscrape/', async (req, res) => {
    const s = new scraper('nos.nl');
    const items = await s.news();

    const m = new mongoService();
    m.connect('scrape', () => {
        items.forEach((item) => {
            m.findDocFieldsByFilter('scrape', { title: item.title }).then((docs) => {
                if (docs.length == 0) {
                    m.insertDocument('scrape', { title: item.title, data: item.data }).then(() => {
                        console.log('Added', item)
                    })
                }
            }, err => { res.send(err) });
        })
    }, (err) => { console.error(err) })
    res.send('news scrape done');
});


app.get('/configuredscrape1/', async (req, res) => {
    const s = new scraper('allekabels.nl');
    const items = await s.scrape();
    // const m = new mongoService();
    // m.connect('scrape', () => {
    //     items.forEach((item) => {
    //         m.findDocFieldsByFilter('scrape', { title: item.title }).then((docs) => {
    //             if (docs.length == 0) {
    //                 m.insertDocument('scrape', { title: item.title, data: item.data }).then(() => {
    //                     console.log('Added', item)
    //                 })
    //             }
    //         }, err => { res.send(err) });
    //     })
    // }, (err) => { console.error(err) })
    res.send('one scrape done (allekabels)');
});


app.get('/config', async (req, res) => {
    settings.loadConfigFile();
    console.log('Config file reloaded');
    res.send('Config file reloaded');
});

// app.get('/settings/:site/:datas', async (req, res) => {
//     const datasAsArray = req.params.datas.split("|");
//     console.log(`Sending settings for site ${req.params.site}, taking datas: ${datasAsArray}`);
//     res.send(settings.getSiteSettings(req.params.site, datasAsArray));
// });

app.get('/sites/meta', async (req, res) => {
    console.log(`Sending meta data for all sites`);
    res.send(settings.getAllMeta());
});


app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));