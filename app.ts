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







// const get_wiki = (term) => {
//     const url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=99&gsrsearch=${term}`;
//     return new Promise((resolve) => {
//         let data = ''
//         https.get(url, res => {
//             res.on('data', chunk => { data += chunk })
//             res.on('end', () => {
//                 resolve(data);
//             })
//         })
//     })
// }

app.get('/', function (req, res) {
    res.send('Hello root!');
});


app.get('/search/:sites/:term', (req, res) => {
    const sites = req.params.sites.split("|");
    search.doSearch(req.params.term, sites[0]).then((r) => {
        res.send(r);
    });
});

// app.get('/wiki/:term', (req, res) => {
//     get_wiki(req.params.term).then((r) => {
//         res.send(r);
//     });
// });

app.get('/use/', (req, res) => {
    res.send('resources works');
});

app.get('/newtest', (req, res) => {

    res.send('newtest');
});

app.get('/thing', (req, res) => {
    const m = new mongoService();
    m.connect('scrape', () => {
        //log success
    }, (err) => {
        () => {
            res.send(err);
            console.error(err);
            //todo: log error
        }
    }).then(() => {
        m.insertDocument('scrape', { 'title': 'hello123' }).then(() => {
            console.log('Document added',)
            res.send('Done');
        }, err => { res.send(err) });
    })
})

app.get('/things', (req, res) => {
    const m = new mongoService();
    m.connect('scrape', () => {
        m.findDocFieldsByFilter('scrape', { title: 'hello123' }).then((docs) => { res.send(docs) }, err => { res.send(err) });
    }, (err) => {
        () => {
            console.error(err);
            //todo: log error
        }
    });
})

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