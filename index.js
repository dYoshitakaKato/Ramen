"use strict";

// モジュールインポート
const express = require("express");
const server = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const https = require("https");
const request = require("request");
const qs = require("querystring");
const client = require("cheerio-httpcli");
const Enumerable = require("linq");

client.set("browser", "android");
//変数
// const APIID = process.env.APIID;
// const SERVERID = process.env.SERVERID;
// const CONSUMERKEY = process.env.CONSUMERKEY;
// const PRIVATEKEY = process.env.PRIVATEKEY;
// const BOTNO = process.env.BOTNO;

server.use(bodyParser.json());

// Webアプリケーション起動
server.listen(process.env.PORT || 3000);

// サーバー起動確認
server.get("/", (req, res) => {
    res.send("Hello World!");
});

// Botからメッセージに応答
server.post("/callback", (req, res) => {
    res.sendStatus(200);

    const latitude = req.body.content.latitude;
    const longitude = req.body.content.longitude;
    const roomId = req.body.source.roomId;
    const accountId = req.body.source.accountId;

    getJWT(jwttoken => {
        getServerToken(jwttoken, newtoken => {
            fetchNearestRamens(token, accountId, latitude, longitude);
            // sendMessage(newtoken, accountId, messages);
        });
    });
});

//サーバーAPI用JWT取得
function getJWT(callback) {
    const iss = SERVERID;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60; //JWTの有効期間は1時間
    const cert = PRIVATEKEY;
    const token = [];
    const jwttoken = jwt.sign(
        { iss: iss, iat: iat, exp: exp },
        cert,
        { algorithm: "RS256" },
        (err, jwttoken) => {
            if (!err) {
                callback(jwttoken);
            } else {
                console.log(err);
            }
        }
    );
}

function getServerToken(jwttoken, callback) {
    const postdata = {
        url: "https://authapi.worksmobile.com/b/" + APIID + "/server/token",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        form: {
            grant_type: encodeURIComponent(
                "urn:ietf:params:oauth:grant-type:jwt-bearer"
            ),
            assertion: jwttoken
        }
    };
    request.post(postdata, (error, response, body) => {
        if (error) {
            console.log(error);
            callback(error);
        } else {
            const jsonobj = JSON.parse(body);
            const AccessToken = jsonobj.access_token;
            callback(AccessToken);
        }
    });
}

function sendMessage(token, accountId, message) {
    const postdata = {
        url:
            "https://apis.worksmobile.com/" + APIID + "/message/sendMessage/v2",
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            consumerKey: CONSUMERKEY,
            Authorization: "Bearer " + token
        },
        json: {
            botNo: Number(BOTNO),
            accountId: accountId,
            content: {
                type: "text",
                text: message
            }
        }
    };
    request.post(postdata, (error, response, body) => {
        if (error) {
            console.log(error);
        }
        console.log(body);
    });
}

function fetchNearestRamens(toekn, accountId, latitude, longtitude) {
    const fetch =
        "https://ramendb.supleks.jp/search?lat=" +
        latitude +
        "&lng=" +
        longtitude +
        "&around=1&order=distance";
    const list = [];
    client
        .fetch(fetch)
        .then(result => {
            result.$("a").each(function(idx) {
                var $url = result.$(this).attr("href");
                if ($url.startsWith("/s/")) {
                    console.log($url);
                    list.push("https://ramendb.supleks.jp" + $url);
                }
            });
        })
        .catch(err => {
            console.log(err);
        })
        .finally(() => {
            console.log("終了");
            fetchRamens(toekn, accountId, list);
        });
}

function fetchRamenDetail(toekn, accountId, url) {
    console.log(url);
    client.fetch(url).then(result => {
        const re = new RegExp("<title>.*?</title>", "g");
        // console.log(re.exec(result.body));
        Enumerable.from(result.body.match(re)).first(tag => {
            const title = tag
                .replace("<title>", "")
                .replace("</title>", "")
                .replace(" | ラーメンデータベース", "");
            const message = title + "\n" + url;
            return sendMessage(toekn, accountId, message);
        });
    });
}

function fetchRamens(toekn, accountId, urls) {
    console.log(urls);
    return Enumerable.from(urls)
        .take(5)
        .forEach(url => {
            return fetchRamenDetail(toekn, accountId, url);
        })
        .catch(err => {
            console.log(err);
        })
        .finally(() => {
            console.log("終了");
        });
}
