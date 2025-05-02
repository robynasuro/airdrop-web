const Datastore = require("nedb");
const db = new Datastore({ filename: "airdrop.db", autoload: true });