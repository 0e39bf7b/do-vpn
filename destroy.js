const fs = require('fs');
const { exec } = require('./util');
const os = require('os');
const path = require('path');

const token = fs.readFileSync(path.join(os.homedir(), '.do-token'), {encoding: 'utf-8'}).trim();

const util = require('util');
const DigitalOcean = require('do-wrapper').default;
const api = new DigitalOcean(token, 100);

(async () => {
  try {
    await exec('nmcli connection down do-vpn');
  } catch(e) {}
  try {
    await exec('nmcli connection delete do-vpn');
  } catch(e) {}
  try {
    const {body: {droplets}} = await api.dropletsGetAll({});
    for (let i = 0; i < droplets.length; i++) {
      if (droplets[i].name === 'vpn') {
        console.log(`delete droplet ${droplets[i].id} (${droplets[i].networks.v4[0].ip_address})`);
        await api.dropletsDelete(droplets[i].id);
      }
    }

    const keys = (await api.accountGetKeys()).body.ssh_keys;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].name === 'do-vpn') {
        console.log(`delete key ${keys[i].id}`);
        await api.accountDeleteKey(keys[i].id);
      }
    }

    try {
      fs.unlinkSync('do_rsa');
      fs.unlinkSync('do_rsa.pub');
    } catch (e) {}

    console.log('Done');
  } catch (e) {
    console.log(`error: ${util.inspect(e)}`);
  }
})();
