require('dotenv').config();
const rethinkdb = require('rethinkdb');

let connection = null;

function getRethinkDBConnection () {
    return new Promise((resolve, reject) => {
        if (connection) resolve(connection);
        rethinkdb.connect(
            {
                host: process.env.RETHINKDB_HOST || "localhost",
                port: process.env.RETHINKDB_PORT || 28015,
                username: process.env.RETHINKDB_USERNAME || "admin",
                password: process.env.RETHINKDB_PASSWORD || "",
                db: process.env.RETHINKDB_NAME || "test",
            }
            , function (err, conn) {
                if (err) reject(err);
                connection = conn;
                rethinkdb.db(process.env.RETHINKDB_NAME).tableCreate('tasks').run(connection, (err, result) => {
                    if (err) reject(err);
                    console.log('created table');
                });
                resolve(conn);
            })
    })
}

module.exports = { getRethinkDBConnection }