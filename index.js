const fs = require('fs');
const process = require('process');
const readline = require('readline');
const std = process.stdout;
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fileName = './package.json';
const file = require(path.resolve(fileName));

async function updatePackages({ dependencies, devDependencies }) {
  const log = message => {
    console.log('\x1b[32m', '\x1b[1m', message);
  };
  const spinner = speed => {
    let index = 0;
    let stop = false;

    readline.cursorTo(process.stdout, 0);
    const spinners = ['-', '\\', '|', '/'];

    function spin() {
      if (!stop) {
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
      spin,
      stop: () => {
        stop = true;
      },
    };
  };

  log('get dependencies...');
  const allDependencies = {
    dependencies: Object.keys(dependencies),
    devDependencies: Object.keys(devDependencies),
  };
  let data = JSON.stringify(allDependencies);

  log('saving to buffer...');
  let buffer = Buffer.from(data);

  let fileWithoutDependencies = file;

  log(`removing old packages versions from ${fileName}...`);
  delete fileWithoutDependencies.dependencies;
  delete fileWithoutDependencies.devDependencies;

  let fromBuffer = buffer.toString();

  log('wighting rest data...');
  fs.writeFile(fileName, JSON.stringify(fileWithoutDependencies), e => {
    if (e) {
      console.error('WRITE FILE ERROR', e);
    }
  });

  const stringOfListDependencies = JSON.parse(fromBuffer).dependencies.join(' ');
  const stringOfListDevDependencies = JSON.parse(fromBuffer).devDependencies.join(' ');

  try {
    spinner.spin();
    log('removing node_modules...');
    await exec('rm -rf node_modules');
    log('node_modules removed!');
    log('installing new packages...');
    await exec('npm i -S ' + stringOfListDependencies);
    log('dependencies has been installed!');
    await exec('npm i -D ' + stringOfListDevDependencies);
    log('devDependencies has been installed!');
    log(`Dependencies has been installed and ${fileName} has been updated!`);
    spinner.stop();
  } catch (e) {
    spinner.stop();
    console.error('EXEC ERROR', e);
  }
}

updatePackages(file);
