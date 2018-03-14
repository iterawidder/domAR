const moment = require("moment");
const express = require('express');
const http = require('http');
const request = require("request");

const {WebSocketServer} = require('./WebSocketServer');

const DEFAULT_INTERVAL = 1000 * 5 * 60; // 5 min
const ERROR_FALLBACK_INTERVAL = 1000 * 10;

const customers = [
    {
        key: "DLAKF",
        company: "Deutsche Lufthansa AG"
    },
    {
        key: "MSFT",
        company: "Microsoft Corporation"
    },
    {
        key: "PBSFF",
        company: "ProsiebenSat.1 Media SE"
    }
];

function startServer() {
    const httpPort = process.argv[3] || 1338;
    const folder = process.argv[2] || 'build';

    const app = express();
    app.use('/', express.static(__dirname + '/' + folder));

    http.createServer(app).listen(httpPort);

    console.log(`serving folder '${folder}' on port: ${httpPort}`);
}

function startWebSocketServer() {

    const webSocketPort = process.argv[4] || 1337;

    const webSocketServer = new WebSocketServer();

    webSocketServer.onMessageCallback = (messaqeString) => {
        webSocketServer.sendStringToAllSockets(messaqeString);
    };

    webSocketServer.connect(webSocketPort);
}

function fetchRemoteApi(url) {
    console.log("Fetching stock updates...")
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            resolve(body);
        });
    });
}

function getUrl(customerKey) {
    return "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol="
        + customerKey + "&interval=5min&apikey=NJLAVFTJ4P80CEWR&datatype=json"
}

function createStockDto(customer, index, jsonData) {
    try {
        const stockValue = JSON.parse(jsonData);
        const symbol = stockValue["Meta Data"]["2. Symbol"];
        const lastRefreshed = stockValue["Meta Data"]["3. Last Refreshed"];
        const currentValue = stockValue["Time Series (5min)"];

        const lastValues = [];
        let i = 0;
        for (let obj in currentValue) {
            let key = obj;
            let val = currentValue[key];

            if (i == 0) {
                lastValues.push(val["2. high"]);
            } else if (i == 1) {
                lastValues.push(val["3. low"]);
            } else {
                break;
            }

            i++;
        }

        const shift = parseFloat(lastValues[0]) - parseFloat(lastValues[1]);
        const trend = (parseFloat(lastValues[0]) / parseFloat(lastValues[1])) * 100 - 100;

        return {
            id: index + 1,
            company: customer.key + " (" + customer.company + ")",
            abbr: symbol,
            updated: moment(lastRefreshed).locale("de").format("DD.MMMM YYYY"),
            value: {
                amount: parseFloat(lastValues[0]).toFixed(2),
                currency: "$"
            },
            shift: shift.toFixed(2),
            trend: trend.toFixed(2)
        };
    } catch (error) {
        console.log(error);
        return null;
    }
}


async function loadStockData(customer, index) {
    return new Promise((resolve) => {
        fetchRemoteApi(getUrl(customer.key)).then((fetchedData) => {
            const jsonData = createStockDto(customer, index, fetchedData);
            resolve(jsonData);
        })
    })

}

function sendStockPrices() {
    // TODO: use an exisiting websocket instead of creating a new one (see code.js file)
    const webSocketPort = process.argv[4] || 1337;
    const webSocketServer = new WebSocketServer();
    webSocketServer.connect(webSocketPort);

    customers.map(async (customer, index) => {
        loadStockData(customer, index).then((stockData) => {
            webSocketServer.sendObjectToAllSockets(stockData)
        })
    });

    setInterval(async () => {
        customers.map(async (customer, index) => {
            loadStockData(customer, index).then((stockData) => {
                console.log(stockData);
                webSocketServer.sendObjectToAllSockets(stockData)
            })
        });
    }, 1000 * 60);
}

startServer();
if (process.argv[5] == "ticker") {
    sendStockPrices();
}
else {
    startWebSocketServer();
}
