import express from "express";
import consign from "consign";

const app = express();

consign({verbose: false})
    .include("libs/config.json")
    .then("libs/middlewares.js")
    .then("routes")
    .then("libs/boot.js")
    .into(app);

module.exports = app;
