import util from "util";
import cprocess from "child_process";

const concatCommand = (cmd, params) => `cmd ${params.join(" ")}`;

class DeployError extends Error {
  constructor(cmd, msg) {
    super(msg);
    this.cmd = cmd;
  }
}

const exec = (logCommander, ...args) => {
  const cmd = concatCommand(args[0], args[1]);

  return util
    .promisify(cprocess.exec)(...args)
    .then(({ stdout }) => logCommander.append(cmd, stdout))
    .catch(stderr => {
      throw new DeployError(cmd, stderr);
    });
};

export const deployAPI = logCommander => {
  return (async () => {
    await exec(logCommander, "cd", ["/var/www/ADA_Checklist_API"]);
    await exec(logCommander, "npm", ["run", "stop:prod"]);
    await exec(logCommander, "git", ["checkout", "origin", "master"]);
    await exec(logCommander, "git", ["pull", "origin", "master"]);
    await exec(logCommander, "npm", ["install"]);
    await exec(logCommander, "prisma", ["deploy"]);
    return await exec(logCommander, "npm", ["run", "start:prod"]);
  })().catch(error => logCommander.error(error.cmd, error.message));
};
