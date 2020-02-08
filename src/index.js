const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fileName = "./package.json";
const file = require(path.resolve(fileName));

async function updatePackages({ dependencies, devDependencies }) {
  const allDependencies = {
    dependencies: Object.keys(dependencies),
    devDependencies: Object.keys(devDependencies)
  };
  let data = JSON.stringify(allDependencies);
  let buffer = Buffer.from(data);

  let fileWithoutDependencies = file;

  delete fileWithoutDependencies.dependencies;
  delete fileWithoutDependencies.devDependencies;

  let fromBuffer = buffer.toString();

  fs.writeFile(fileName, JSON.stringify(fileWithoutDependencies), e => {
    if (e) {
      console.error('WRITE FILE ERROR', e);
    }
  });

  const stringOfListDependencies = JSON.parse(fromBuffer).dependencies.join(
    " "
  );
  const stringOfListDevDependencies = JSON.parse(
    fromBuffer
  ).devDependencies.join(" ");

  try {
    await exec("npm i -S " + stringOfListDependencies);
    await exec("npm i -D " + stringOfListDevDependencies);
    console.log("Package json updated!");
  } catch (e) {
    console.error("EXEC ERROR", e);
  }
}

updatePackages(file);
