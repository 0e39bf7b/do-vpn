const child_process = require('child_process');

const STDOUT_BUFFER_SIZE = 1024 * 1024; // 1 Mb

function exec(cmd) {
  console.log(cmd);
  return new Promise((resolve, reject) => {
    const child = child_process.exec(
      cmd,
      { shell: true, maxBuffer: STDOUT_BUFFER_SIZE },
      (code) => {
        if (code) {
          reject(code);
        } else {
          resolve();
        }
      },
    );

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

module.exports = { exec };
