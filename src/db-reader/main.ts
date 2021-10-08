var mysql = require('mysql');

var connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.SECRET,
  database: process.env.DBNAME,
});

exports.main = (event, context, callback) => {
    connection.query('show tables', function (error, results, fields) {
      if (error) {
        connection.destroy();
        throw error;
      } else {
        console.log(results);
        callback(error, results);
        connection.end(function (err) { callback(err, results);});
      }
    });
  }