const fs = require('fs');
const { exec } = require('./util');

const token = fs.readFileSync('do-token.txt', {encoding: 'utf-8'}).trim();

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
        console.log(`delete ${droplets[i].id} (${droplets[i].networks.v4[0].ip_address})`);
        await api.dropletsDelete(droplets[i].id);
      }
    }
    console.log('Done');
  } catch (e) {
    console.log(`error: ${util.inspect(e)}`);
  }
})();
