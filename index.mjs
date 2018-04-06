/**
 * How append new deploy
 * =====================
 * 1. In file `index.js` add deployment type to `Types` object
 * 2. In file `index.js` add a method with the name of the repository to `Repositories` object
 * 3. In file `deploy.js` add commands for deployment
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

const Types = {
  API: "api",
  NEXT: "next"
};

// set the view engine to ejs
app.set("view engine", "ejs");

const Repositories = {
  ADA_Checklist_API(payload) {
    if (/\/master$/.test(payload.ref)) {
      const logCommanderAPI = new LogCommander(Types.API);
      LogCommander.removeOldLogs(Types.API);
      return deployAPI(logCommanderAPI);
    }
  },
  ADA_Checklist_NEXT(payload) {
    if (/\/master$/.test(payload.ref)) {
      const logCommanderNEXT = new LogCommander(Types.NEXT);
      LogCommander.removeOldLogs(Types.NEXT);
      return deployNEXT(logCommanderNEXT);
    }
  }
};

const executeDeploy = payload => {
  const repName = payload.repository.name;

  if (Repositories[repName]) {
    return Repositories[repName](payload);
  }
};

const existType = type => Object.values(Types).includes(type);

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
  res.render("pages/index", { logTypes: Object.values(Types) });
});

app.get("/:type", (req, res, next) => {
  const { type } = req.params;

  if (!existType(type)) {
    res.status(httpStatus.NOT_FOUND);
    return next(new Error("Unknow Type"));
  }

  LogCommander.removeOldLogs(type);

  const fileNames = LogCommander.getFileNames(type);
  const logContents = fileNames
    .map(fileName => LogCommander.getLogContent(fileName))
    .filter(logContent => !!logContent);

  res.render("pages/list", { logContents, type });
});

app.get("/:type/:logName", (req, res, next) => {
  const { type, logName } = req.params;

  if (!existType(type)) {
    res.status(httpStatus.NOT_FOUND);
    return next(new Error("Unknow Type"));
  }

  LogCommander.removeOldLogs(type);

  const logContent = LogCommander.getLogContent(logName);

  if (logContent) {
    res.render("pages/log", { logContent, type });
  } else {
    res.status(httpStatus.NOT_FOUND).send("Logs not found");
  }
});

app.post("/", (req, res, next) => {
  try {
    const deployResult = executeDeploy(JSON.parse(req.body.payload));

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
