var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  port: "3306"
});

con.connect(function(err) {
  if (err) throw err;
  con.query("CREATE DATABASE IF NOT EXISTS matcha", function (err, result) {
    if (err) throw err;
  });

  con.query("use matcha", function (err, result) {
    if (err) throw err;
  });

  con.query("CREATE TABLE IF NOT EXISTS users("+
      "id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,"+
      "email VARCHAR(255) NOT NULL,"+
      "password VARCHAR(1000) NOT NULL,"+
      "pseudo VARCHAR(20) NOT NULL,"+
      "nom VARCHAR(40) NOT NULL,"+
      "prenom VARCHAR(40) NOT NULL," +
      "sexe enum('homme', 'femme') DEFAULT NULL," +
      "orientation_sexuelle enum('bisexuel', 'heterosexuel', 'homosexuel') NOT NULL DEFAULT 'bisexuel'," +
      "bio VARCHAR(255) DEFAULT NULL," +
      "liste_interet VARCHAR(255) DEFAULT NULL," +
      "actif tinyint(1) DEFAULT 0," +
      "img_1 VARCHAR(255) DEFAULT NULL," +
      "img_2 VARCHAR(255) DEFAULT NULL," +
      "img_3 VARCHAR(255) DEFAULT NULL," +
      "img_4 VARCHAR(255) DEFAULT NULL," +
      "img_5 VARCHAR(255) DEFAULT NULL)", function (err, result) {
    if (err) throw err;
  });

});
