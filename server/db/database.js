const Datastore = require("nedb");
const db = new Datastore({ filename: "airdrop.db", autoload: true });

// Migrasi data: tambah field status dan lastUpdated ke dokumen lama
db.find({}, (err, docs) => {
  if (err) {
    console.error("Error during migration:", err);
    return;
  }
  docs.forEach(doc => {
    if (!doc.status || !("lastUpdated" in doc)) {
      db.update(
        { _id: doc._id },
        { $set: { status: doc.status || "active", lastUpdated: doc.lastUpdated || null } },
        {},
        (err, numAffected) => {
          if (err) console.error("Error updating doc:", err);
        }
      );
    }
  });
});

module.exports = db;