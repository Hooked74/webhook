import fs from "fs";
import path from "path";

export class LogStructure {
  static getFileName(name) {
    return /\.json$/.test(name) ? name : `${name}.json`;
  }

  constructor(type = LogStructure.BASE_TYPE) {
    this.created = Date.now();
    this.type = type;
    this.finished = false;
    this.error = null;
    this.success = [];
    this.name =
      type +
      LogStructure.NAME_SEPARATOR +
      this.date +
      LogStructure.NAME_SEPARATOR +
      Math.round(Math.random() * 1e5);
  }

  appendSuccess(cmd, msg) {
    this.success.push({ cmd, msg });
  }

  setError(cmd, msg) {
    this.error = { cmd, msg };
  }

  close() {
    this.finished = true;
  }

  getFileName() {
    return LogStructure.getFileName(this.name);
  }

  getJSON() {
    return JSON.stringify({
      type: this.type,
      name: this.name,
      created: this.created,
      finished: this.finished,
      success: this.success,
      error: this.error
    });
  }
}

LogStructure.BASE_TYPE = "base";
LogStructure.NAME_SEPARATOR = "-";

export class LogCommander {
  static getFileNames(type) {
    const dir = LogCommander.LOG_PATH;

    return fs.readdirSync(dir).filter(file => {
      return (
        fs.statSync(path.resolve(dir, file)).isFile() &&
        new RegExp("^" + type + "-").test(file)
      );
    });
  }

  static removeOldLogs(type) {
    LogCommander.getFileNames(type)
      .map(fileName => ({
        fileName,
        created: parseInt(fileName.split(LogStructure.NAME_SEPARATOR)[1])
      }))
      .sort((a, b) => a.created < b.created)
      .slice(LogCommander.MAX_STORAGE_COUNT)
      .forEach(file => {
        fs.unlinkSync(path.resolve(LogCommander.LOG_PATH, file.fileName));
      });
  }

  static getLogContent(logName) {
    const fileName = LogStructure.getFileName(logName);
    const filePath = path.resolve(LogCommander.LOG_PATH, fileName);

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    return false;
  }

  constructor(type) {
    this.logStructure = new LogStructure(type);
    this.filePath = path.resolve(
      LogCommander.LOG_PATH,
      this.logStructure.getFileName()
    );
    this.updateFile();
  }

  updateFile() {
    fs.writeFileSync(this.filePath, this.logStructure.getJSON(), "utf8");
    return this;
  }

  append() {
    this.logStructure.appendSuccess(...arguments);
    return this.updateFile();
  }

  error() {
    this.logStructure.setError(...arguments);
    return this.updateFile();
  }

  close() {
    this.logStructure.close();
    return this.updateFile();
  }
}

LogCommander.DIR_NAME = process.cwd();
LogCommander.LOG_DIR = "logs";
LogCommander.LOG_PATH = path.resolve(
  LogCommander.DIR_NAME,
  LogCommander.LOG_DIR
);
LogCommander.MAX_STORAGE_COUNT = 50;
