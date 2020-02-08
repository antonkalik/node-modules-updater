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
  let white = '\x1b[37m';
  return {
    success: message => {
      std.clearLine(0);
      std.cursorTo(1);
      std.write(bold);
      std.write(green);
      std.write('✔ ' + message + '.' + '\n');
    },
    process: message => {
      std.clearLine(0);
      std.cursorTo(3);
      std.write(bold);
      std.write(white);
      std.write(message + '...');
    },
    error: message => {
      std.clearLine(0);
      std.cursorTo(1);
      std.write(bold);
      std.write(red);
      std.write('✘ ' + message + '.' + '\n');
    },
  };
}

function Spinner(speed = 100) {
  let index = 0;
  let spinners = ['-', '\\', '|', '/'];

  function spin() {
    setTimeout(() => {
      readline.cursorTo(std, 1);
      process.stderr.write('\x1B[?25l');
      std.write(spinners[index]);
      index++;
      if (index + 1 === spinners.length) {
        index = 0;
      }
      spin();
    }, speed);
  }
  return {
    start: spin,
    stop: () => process.exit(),
  };
}

const spinner = Spinner(100);
const log = Logger();

async function updatePackages({ dependencies, devDependencies }) {
  let allDependencies;
  spinner.start();
  log.process('Getting dependencies');
  log.success('Prefetch dependencies');

  try {
    allDependencies = {
      dependencies: Object.keys(dependencies),
      devDependencies: Object.keys(devDependencies),
    };
  } catch {
    throw 'Looks like something went wrong with your dependencies in ' + fileName;
  }

  let data = JSON.stringify(allDependencies);
  log.success('Dependencies has been fetched');

  log.process('Saving to buffer');
  let buffer = Buffer.from(data);
  let fileWithoutDependencies = file;
  log.success('Dependencies has been saved to buffer');

  log.process(`Removing old packages versions from ${fileName}`);
  delete fileWithoutDependencies.dependencies;
  delete fileWithoutDependencies.devDependencies;
  log.success('Old packages has been removed');

  log.process('Getting data from buffer');
  let fromBuffer = buffer.toString();

  log.process(`Writing data to ${fileName}`);
  fs.writeFile(fileName, JSON.stringify(fileWithoutDependencies), e => {
    if (e) throw `Write ${fileName} error`;
    log.success(`${fileName} has been updated`);
  });

  const stringOfListDependencies = JSON.parse(fromBuffer).dependencies.join(' ');
  const stringOfListDevDependencies = JSON.parse(fromBuffer).devDependencies.join(' ');

  try {
    log.process('Removing node_modules');
    await exec('rm -rf node_modules');
    log.success('node_modules removed');
  } catch {
    throw "Can't remove node_modules";
  }

  try {
    log.process('Installing new packages');
    log.process('Installing dependencies');
    await exec('npm i -S ' + stringOfListDependencies);
    log.success('dependencies has been installed');
  } catch {
    throw "Can't installing dependencies";
  }

  try {
    log.process('Installing devDependencies');
    await exec('npm i -D ' + stringOfListDevDependencies);
    log.success('devDependencies has been installed');
    log.success(`All dependencies has been installed and ${fileName} has been updated`);
    spinner.stop();
  } catch (e) {
    throw "Can't installing devDependencies";
  }
}

updatePackages(file).catch(e => {
  log.error(e);
  spinner.stop();
});
