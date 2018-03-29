import util from "util";
import cprocess from "child_process";

const concatCommand = (cmd, params) => `${cmd} ${params.join(" ")}`;

class DeployError extends Error {
  constructor(cmd, msg) {
    super(msg);
    this.cmd = cmd;
  }
}

const exec = (logCommander, ...args) => {
  const cmd = args[0];

  return util
    .promisify(cprocess.exec)(...args)
    .then(({ stdout }) => logCommander.append(cmd, stdout))
    .catch(stderr => {
      throw new DeployError(cmd, stderr);
    });
};

export const deployAPI = logCommander => {
  return (async () => {
    const toDir = "cd /var/www/ADA_Checklist_API && ";

    await exec(logCommander, `${toDir}npm run stop:prod`);
    await exec(logCommander, `${toDir}git checkout master`);
    await exec(logCommander, `${toDir}git pull origin master`);
    await exec(logCommander, `${toDir}npm install`);
    await exec(logCommander, `${toDir}prisma deploy`);
    return await exec(logCommander, `${toDir}npm run start:prod`);
  })().catch(error => logCommander.error(error.cmd, error.message));
};
