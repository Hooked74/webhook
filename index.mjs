/**
 * How append new deploy
 * =====================
 * 1. In file `index.js` add deployment type (const API_TYPE)
 * 2. In file `index.js` in `app.post("/")` add deployment condition
 * 3. In file `deploy.js` add commands for deployment
 * 4. In file `index.js` add monitoring routes (app.get(`/${API_TYPE}`), app.get(`/${API_TYPE}:logName`))
 * 5. In file `index.js` append log type in app.get(`/`)
 */

import fs from "fs";
import path from "path";
import httpStatus from "http-status";
import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";

import { deployAPI } from "./deploy";
import { LogCommander } from "./log";

const port = 8000;
const app = express();

const API_TYPE = "api";

// set the view engine to ejs
app.set("view engine", "ejs");

/**
 * Express configuration.
 */
app
  .use(morgan("dev")) // :method :url :status :response-time ms - :res[content-length]
  .use(bodyParser.json()) // Parse application/json
  .use(bodyParser.urlencoded({ extended: true })) // Parse application/x-www-form-urlencoded
  .use(
    cors({
      origin: /./,
      credentials: true
    })
  ) // Enable Cross Origin Resource Sharing
  .use(helmet()); // Secure your app by setting various HTTP headers

app
  .disable("x-powered-by") // Disable 'X-Powered-By' header in response
  .disable("etag"); // Remove No Cache Control

// mount all routes on / path
app.get(`/`, (req, res, next) => {
  res.render("pages/index", { logTypes: [API_TYPE] });
});

app.get(`/${API_TYPE}`, (req, res, next) => {
  LogCommander.removeOldLogs(API_TYPE);

  const fileNames = LogCommander.getFileNames(API_TYPE);
  const logContents = fileNames
    .map(fileName => LogCommander.getLogContent(fileName))
    .filter(logContent => !!logContent);

  res.render("pages/list", { logContents, type: API_TYPE });
});

app.get(`/${API_TYPE}/:logName`, (req, res, next) => {
  LogCommander.removeOldLogs(API_TYPE);

  const logContent = LogCommander.getLogContent(req.params.logName);

  if (logContent) {
    res.render("pages/log", { logContent, type: API_TYPE });
  } else {
    res.status(httpStatus.NOT_FOUND).send("Logs not found");
  }
});

app.post("/", (req, res, next) => {
  try {
    const payload = JSON.parse(req.body.payload);
    let deployResult = null;

    if (
      payload.repository.name === "ADA_Checklist_API" &&
      /\/master$/.test(payload.ref)
    ) {
      const logCommanderAPI = new LogCommander(API_TYPE);
      LogCommander.removeOldLogs(API_TYPE);
      deployResult = deployAPI(logCommanderAPI);
    }

    // TODO: append new deploy

    if (deployResult) {
      deployResult.then(logCommander => logCommander.close());
    }

    res.send({ success: !!deployResult });
  } catch (e) {
    res.send({ msg: e.message, stack: e.stack });
  }
});

app.use((err, req, res, next) => {
  res.send(err.toString());
});

/**
 * Start Express server.
 */
app.listen(port, () => {
  console.log(
    `App is running at http://localhost:${port} in ${app.get("env")} mode`
  );
});
