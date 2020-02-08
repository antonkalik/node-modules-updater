const fs = require('fs');
const process = require('process');
const readline = require('readline');
const std = process.stdout;
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fileName = './package.json';
const file = require(path.resolve(fileName));

function Logger() {
  let bold = '\x1b[1m';
  let green = '\x1b[32m';
  let red = '\x1b[31m';
  return {
    success: message => console.log(green, bold, message),
    error: message => console.log(red, bold, message),
  };
}

function Spinner(speed = 100) {
  let index = 0;

  readline.cursorTo(process.stdout, 0);
  const spinners = ['-', '\\', '|', '/'];

  function spin(isStop) {
    if (!isStop) {
      setTimeout(() => {
        readline.cursorTo(process.stdout, 0);
        std.write(spinners[index]);
        index++;
        if (index + 1 === spinners.length) {
          index = 0;
        }
        spin();
      }, speed);
    }
  }
  return {
    start: () => spin(false),
    stop: () => {
      process.on('exit', code => {
        console.log(`Finished with: ${code}`);
      });
    },
  };
}

const spinner = Spinner(100);
const log = Logger();

async function updatePackages({ dependencies, devDependencies }) {
  let allDependencies;

  log.success('get dependencies...');

  try {
    allDependencies = {
      dependencies: Object.keys(dependencies),
      devDependencies: Object.keys(devDependencies),
    };
  } catch {
    throw 'Looks like something went wrong with your dependencies in ' + fileName;
  }

  let data = JSON.stringify(allDependencies);

  log.success('saving to buffer...');
  let buffer = Buffer.from(data);
  let fileWithoutDependencies = file;

  log.success(`removing old packages versions from ${fileName}...`);
  delete fileWithoutDependencies.dependencies;
  delete fileWithoutDependencies.devDependencies;

  let fromBuffer = buffer.toString();

  log.success('wighting rest data...');
  fs.writeFile(fileName, JSON.stringify(fileWithoutDependencies), e => {
    if (e) {
      throw `Write ${fileName} error`;
    }
  });

  const stringOfListDependencies = JSON.parse(fromBuffer).dependencies.join(' ');
  const stringOfListDevDependencies = JSON.parse(fromBuffer).devDependencies.join(' ');

  try {
    spinner.start();
    log.success('removing node_modules...');
    await exec('rm -rf node_modules');
    spinner.stop();
    log.success('node_modules removed!');
    log.success('installing new packages...');
    spinner.start();
    await exec('npm i -S ' + stringOfListDependencies);
    spinner.stop();
    log.success('dependencies has been installed!');
    spinner.start();
    await exec('npm i -D ' + stringOfListDevDependencies);
    spinner.stop();
    log.success(`Dependencies has been installed and ${fileName} has been updated!`);
  } catch (e) {
    throw 'Installing packages error.';
  }
}

updatePackages(file).catch(e => {
  spinner.stop();
  log.error(e);
});
