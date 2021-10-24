# DO VPN

This script allows to create OpenVPN tunnel on [DigitalOcean](https://digitalocean.com) VM and
destroy it as soon as it becomes useless. The script is tested on Ubuntu 20.04, Ubuntu 21.04 and
Kubuntu 21.04. It can work on different Linux distributions with network-manager and OpenVPN
installed but I'm not sure.

## Usage

* make sure you have Node.js and npm installed;
* clone this repo;
* `npm pack`;
* `npm install <the-package-from-previous-step.tgz>`;
* create file `~/.do-vpn.json` with such fields: `token` - token for Digital Ocean API and
* `region` - the region where VM should be placed, eg. `ams3`;
* use `create-vpn` to start OpenVPN VM and `destroy-vpn` to stop it.
