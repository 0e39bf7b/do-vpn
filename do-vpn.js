const Client = require('ssh2').Client;
const fs = require('fs');
const path = require('path');
const os = require('os');

const scriptName = 'openvpn-install.sh';
const token = fs.readFileSync('do-token.txt', {encoding: 'utf-8'}).trim();

const util = require('util');
const DigitalOcean = require('do-wrapper').default;
const api = new DigitalOcean(token, 100);

const { exec } = require('./util');

(async () => {
  const keys = (await api.accountGetKeys()).body.ssh_keys;
  const sshKey = keys.find(key => key.name === 'laptop').id;
  console.log(`key id: ${sshKey}`);

  const dropletId = (await api.dropletsCreate({
    "name": "vpn",
    "region": "ams3",
    "size": "s-1vcpu-1gb",
    "image": "ubuntu-20-04-x64",
    "ssh_keys": [sshKey],
    "backups": false,
    "private_networking": null,
    "volumes": null
  })).body.droplet.id;

  console.log(`droplet ${dropletId} created`);

  while (1) {
    const {body: {droplet}} = await api.dropletsGetById(dropletId);
    if (droplet.status === 'active') {
      console.log(droplet.networks.v4);
      const ip = droplet.networks.v4.find(n => n.type === 'public').ip_address;
      console.log();
      console.log(`droplet is ready, ip: ${ip}`);
      try {
        await setupVPN(ip);
      } catch (e) {
        console.log(`Error occured: ${util.inspect(e, {depth: null})}`);
        console.log(`remove droplet ${dropletId}`);
        await api.dropletsDelete(dropletId);
      }
      break;
    }
    process.stdout.write('.');
  }
})().catch(e => {
  console.log(`Error occured: ${util.inspect(e, {depth: null})}`);
});

function setupVPN(host) {
  return new Promise((resolveSetupVPN, rejectSetupVPN) => {
    setupVPNRoutine(host, resolveSetupVPN, rejectSetupVPN);
  });
}

function setupVPNRoutine(host, resolveSetupVPN, rejectSetupVPN) {
  const conn = new Client();

  console.log('starting setup');
  conn.on('ready', async () => {
    try {
      console.log('starting setup');

      const scriptText = fs.readFileSync(scriptName, {encoding: 'utf-8'});
      await execRemote(`cat > ${scriptName}`, scriptText);
      await execRemote(`chmod +x ${scriptName}`)

      await execRemote(`echo "1\\n1\\n1\\n1\\n1" | ./${scriptName}`);

      const clientData = await readRemoteCmdOutput('cat /root/do-vpn.ovpn');
      conn.end();

      fs.writeFileSync('do-vpn.ovpn', clientData);
      await exec('nmcli connection import type openvpn file do-vpn.ovpn');
      await exec('nmcli connection up do-vpn');
      resolveSetupVPN();
    } catch (e) {
      console.log(e);
      conn.end();
      rejectSetupVPN(e);
    }
  });

  conn.on('error', (e) => {
    console.log(`connection error ${e}`);
    setupVPNRoutine(host, resolveSetupVPN, rejectSetupVPN)
  });

  conn.connect({
    host,
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh/id_rsa')),
    readyTimeout: 120000
  });

  function execRemote(cmd, inputData) {
    console.log(cmd);
    return new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          reject(new Error(err));
          return;
        }

        stream.on('close', (code, signal) => {
          if (code || signal) {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            reject(new Error());
          } else {
            resolve();
          }
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });

        if (inputData) {
          stream.end(inputData);
        }
      });
    });
  }

  function readRemoteCmdOutput(cmd) {
    console.log(cmd);
    return new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          reject(new Error(err));
          return;
        }

        let output = '';

        stream.on('close', (code, signal) => {
          if (code || signal) {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            reject(new Error());
          } else {
            resolve(output);
          }
        }).on('data', (data) => {
          process.stdout.write(data);
          output = `${output}${data}`;
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  }
}