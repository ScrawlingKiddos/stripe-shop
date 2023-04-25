const express = require("express");
const app = express();
const crypto = require('crypto');
const fs = require('fs');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const http = require("http");
const sqlite3 = require("sqlite3")
const isHttps = false;
const https = require('https');
let server = null;
const port = (isHttps) ? 443 : 4242
if (isHttps) {
    server = https.createServer({
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    }, app)
} else {
    server = http.createServer(app);
}
const expressWs = require('express-ws')(app, server);
const flatted = require('flatted');
// This is your test secret API key.
const stripe = require("stripe")('YOUR_PRIVATE_STRIPE_KEY');
const objs = new Map();
const wbs = new Map();
app.use(express.static("public"));
app.use(express.static("views"));
app.use(express.json());
app.engine('html', require('ejs').renderFile);
const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

const defaultItems = [
    {
        name: "Ciasto z sercem zawijcie",
        price: 400,
        quanity: 1,
        seller: null,
    },
    {
        name: "3x Faworki",
        price: 200,
        quanity: 1,
        seller: null,
    },
    {
        name: "Babeczka",
        price: 300,
        quanity: 1,
        seller: null,
    },
    {
        name: "Kawa z mlekiem",
        price: 300,
        quanity: 1,
        seller: null,
    },
    {
        name: "Kawa bez mleka",
        price: 200,
        quanity: 1,
        seller: null,
    },
    {
        name: "Herbata czarna",
        price: 300,
        quanity: 1,
        seller: null,
    },
    {
        name: "Herbata walentynkowa",
        price: 400,
        quanity: 1,
        seller: null,
    },
    {
        name: "Większy kubek lub pojemnik",
        price: 100,
        quanity: 1,
        seller: null,
    },
    {
        name: "Dostawa",
        price: 100,
        quanity: 1,
        seller: null,
    },
    {
        name: "Rabat",
        price: -100,
        quanity: 1,
        seller: null,
    },
    {
        name: "Tarot",
        price: 400,
        quanity: 1,
        seller: null,
    },
    {
        name: "Pączek",
        price: 300,
        quanity: 1,
        seller: null,
    },
    {
        name: "Ciasto \"Czerwony aksamit\"",
        price: 400,
        quanity: 1,
        seller: null,
    }
]

class Product {
    constructor(name, price, quanity, seller = null) {
        this.name = name;
        this.price = price;
        this.quanity = quanity;
        this.seller = seller;
    }

    changeQuanity(quanity) {
        this.quanity = quanity;
        if (this.seller) {
            this.seller.reloadPages()
        }
    }

    changePrice(price) {
        this.price = price;
        if (this.seller) {
            this.seller.reloadPages()
        }
    }
}

class Seller {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.ownWs = [];
        this.presets = defaultItems;
        this.ws = null;
        this.products = [];
        this.db = null;
        setInterval(this.keepAlive, 5000);
    }

    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }

    setWs(ws) {
        this.ws = ws;
    }

    get getWs() {
        return this.ws;
    }

    getOwnWs() {
        return this.ownWs;
    }

    addProduct(product) {
        this.products.push(product);
    }

    removeProduct(product) {
        this.products = this.products.filter((p) => p !== product);
    }

    getProducts() {
        return this.products;
    }

    getExactProduct(name) {
        return this.products.find((p) => p.name === name);
    }

    ownWsSends(msg) {
        for (var ws of this.ownWs) {
            ws.send(msg);
        }
    }

    reloadPages() {
        this.ownWsSends("reloadPages");
        if (this.ws) {
            this.sendTemplates(this.ws);
            this.sendProducts(this.ws);
        }
    }

    sendTemplates(ws) {
        ws.send("getTemplates " + JSON.stringify(this.presets));
    }

    sendProducts(ws) {
        let data = this.getProducts();
        for (let i of data) {
            i.seller = null;
        }
        ws.send('getProducts ' + JSON.stringify(data));
    }

    completePurchase(id = null) {

        if (this.db) {
            this.db.serialize(() => {
                let sum = 0;
                for (let product of this.products) {
                    sum += parseInt(product.price) * parseInt(product.quanity);
                }
                if (sum <= 0) {
                    return;
                }
                this.db.run("INSERT INTO sprzedaz VALUES ($id, $cena, $produkty)", {
                    $id: (id == null) ? 0 : id,
                    $cena: sum,
                    $produkty: JSON.stringify(this.products)
                })
            })
        }

        this.products = []
        // place for adding payment to database, if necessary
        this.reloadPages()
    }

    initializeBuyer() {
        if (!this.ws) {
            return;
        }
        let obj2 = this;
        this.ws.on('message', function (msg, obj = obj2) {
            if (msg.toString() === "getProducts") {
                obj.sendProducts(obj2.ws);
            }
            if (msg.toString() === "getTemplates") {
                obj.sendTemplates(obj2.ws);
            }
            if (msg.toString() === "paymentFailed") {
                obj.ownWsSends("renewPayment");
            }
            if (msg.toString().startsWith("paymentSuccess")) {
                if (msg.toString().split(" ").length === 2) {
                    obj.completePurchase(msg.toString().split(" ")[1])
                } else {
                    obj.completePurchase();
                }
            }
        })
    }

    keepAlive() {
        if (this.ws) {
            this.ws.send("keepAlive");
        }
        if (this.ownWs) {
            this.ownWsSends("keepAlive");
        }
    }

    initialize(ws) {
        let obj2 = this;
        if (!this.db) {
            this.db = new sqlite3.Database("./sales.db",
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                (err) => {
                    // do your thing 
                }
            );
            this.db.serialize(() => {
                this.db.run("CREATE TABLE IF NOT EXISTS sprzedaz (purchase_id VARCHAR(512), cena INTEGER, zakupy TEXT);")
            })
        }

        if (!this.ws) {
            ws.send("noBuyerWs");
        }

        ws.on('message', function (msg, obj = obj2) {


            if (msg.toString() === ("buy")) {
                let sum = 0;
                for (let product of obj.products) {
                    sum += parseInt(product.price) * parseInt(product.quanity);
                }
                if (sum <= 0) {
                    return;
                }
                const paymentIntent = stripe.paymentIntents.create({
                    amount: sum,
                    currency: "pln",
                    payment_method_types: ['blik']
                }).then((res, obj2 = obj) => {
                    obj2.ws.send("paymentIntent " + res.client_secret);
                });

            }

            if (msg.toString().startsWith("reloadPages")) {
                obj.reloadPages();
            }
            if (msg.toString().startsWith("buyerws")) {
                let incm = msg.toString().split(" ");
                obj.setWs(wbs.get(incm[1]));
                obj.initializeBuyer();
            }

            if (msg.toString() === "getProducts") {
                obj.sendProducts(ws);
            }
            if (msg.toString().startsWith("renewTemplates")) {
                let incm = msg.toString().split(" ");
                let data = JSON.parse(incm.splice(1, incm.length).join(' '));
                obj.presets = data;
            }
            if (msg.toString().startsWith("getTemplates")) {
                ws.send('getTemplates ' + JSON.stringify(obj.presets));
                obj.ws.send('getTemplates ' + JSON.stringify(obj.presets));
            }
            if (msg.toString().split(" ")[0].startsWith("renewProducts")) {
                let incm = msg.toString().split(" ");
                let data = JSON.parse(incm.splice(1, incm.length).join(' '));
                obj.products = [];
                for (let i = 0; i < data.length; i++) {
                    let product = new Product(data[i].name, data[i].price, data[i].quanity, obj);
                    obj.addProduct(product);
                }
            }
            if (msg.toString() === "paymentSuccess") {
                obj.completePurchase();
            }
        });
    }
}

app.get('/', function (req, res) {
    let session = req.session;
    if (!session["buyerID"]) {
        session["buyerID"] = crypto.randomBytes(3).toString('hex');
    }
    res.render('buyer.html');
});

app.ws('/wsbuyer', function (ws, req) {

    ws.on('message', function (msg) {
    });
    let session = req.session;
    if (session['buyerID']) {
        if (wbs.has(session['buyerID'])) {
            let oldWs = wbs.get(session['buyerID']);
            objs.forEach((value, key) => {
                if (value.ws === oldWs) {
                    value.ws = (ws)
                    value.initializeBuyer();
                }
            })
        }
        wbs.set(session['buyerID'], ws);
        ws.send("ID: " + session['buyerID']);
    }
})

app.get('/seller', function (req, res) {
    let session = req.session;
    console.log(req.query.id)
    if (req.query.id) {
        for (let obj of objs.values()) {
            if (obj.ws === wbs.get(req.query.id) && obj.ownWs.length > 0) {
                objs.forEach((value, key) => {
                    if (value === obj) {
                        session["sellerID"] = key;
                    }
                })
                break;
            }
        }
    }
    console.log("Sesja1:" + session["sellerID"])
    if (!session["sellerID"]) {
        const id = crypto.randomBytes(3).toString('hex');
        objs.set(id, new Seller(id))
        session["sellerID"] = id;
    }
    console.log("Sesja2:" + session["sellerID"])
    res.render('seller.html');
})

app.ws('/wsseller', function (ws, req) {
    ws.on('message', function (msg) {
        if (msg.toString() !== "init") {
            return;
        }
        let session = req.session;
        if (session['sellerID']) {
            objs.get(session['sellerID']).ownWs.push(ws);
            objs.get(session['sellerID']).initialize(ws);
            ws.send(`Initialized! ${session['sellerID']}`)
        } else {
            ws.send("?")
        }
    })
})

server.listen(port, '0.0.0.0', () => console.log(`Node server listening on port ${port}!`));