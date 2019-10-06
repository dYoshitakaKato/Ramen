"use strict";

// モジュールインポート
const express = require("express");
const server = express();

// Webアプリケーション起動
server.listen(process.env.PORT || 3000);

// サーバー起動確認
server.get('/', (req, res) => {
    res.send('Hello World!');
});

// Botからメッセージに応答
server.post('/callback', (req, res) => {
    res.sendStatus(200);
});