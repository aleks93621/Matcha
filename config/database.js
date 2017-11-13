var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root"
});

con.connect(function(err) {
  if (err) throw err;
//  console.log("Connected!");

  con.query("CREATE DATABASE IF NOT EXISTS matcha", function (err, result) {
    if (err) throw err;
  });

  con.query("use matcha", function (err, result) {
    if (err) throw err;
//    console.log("using db matcha");
  });

  con.query("CREATE TABLE IF NOT EXISTS users("+
      "id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,"+
      "email VARCHAR(255) NOT NULL,"+
      "password VARCHAR(1000) NOT NULL,"+
      "pseudo VARCHAR(255) NOT NULL,"+
      "nom VARCHAR(255) NOT NULL,"+
      "prenom VARCHAR(255) NOT NULL," +
      "geoloc VARCHAR(255) DEFAULT ''," +
      "geoloc_lat VARCHAR(255) DEFAULT 0," +
      "geoloc_long VARCHAR(255) DEFAULT 0," +
      "sexe enum('homme', 'femme', 'neutre') DEFAULT 'neutre'," +
      "orientation_sexuelle enum('bisexuel', 'heterosexuel', 'homosexuel') NOT NULL DEFAULT 'bisexuel'," +
      "bio TEXT DEFAULT NULL," +
      "score INT DEFAULT 0," +
      "age INT DEFAULT -1," +
      "report INT DEFAULT 0," +
      "liste_interet VARCHAR(10000) DEFAULT ''," +
      "tags INT DEFAULT 0," +
      "dist FLOAT DEFAULT 0," +
      "key_pwd VARCHAR(1000) DEFAULT 'no_key',"+
      "date_conn VARCHAR(15) DEFAULT '-')", function (err, result) {
    if (err) throw err;
  //  console.log("Table users created");
  });

    con.query("CREATE TABLE IF NOT EXISTS messages("+
        "id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,"+
        "id_src INT NOT NULL,"+
        "id_user INT NOT NULL,"+
        "content VARCHAR(10000) NOT NULL,"+
        "date VARCHAR(15) DEFAULT NULL,"+
        "vu INT DEFAULT 0)", function (err, result) {
        if (err) throw err;
    //    console.log("Table messages created");
    });

    con.query("CREATE TABLE IF NOT EXISTS likes("+
        "id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,"+
        "id_un INT NOT NULL,"+
        "like_un INT NOT NULL,"+
        "id_deux INT NOT NULL,"+
        "like_deux INT NOT NULL)", function (err, result) {
        if (err) throw err;
     //   console.log("Table messages created");
    });

    con.query("CREATE TABLE IF NOT EXISTS notifs("+
        "id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,"+
        "id_user INT NOT NULL,"+
        "type INT NOT NULL,"+
        "id_src INT NOT NULL,"+
        "vu INT DEFAULT 0)", function (err, result) {
        if (err) throw err;
     //   console.log("Table messages created");
    });

    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Dupont','Charles','cdupont','cdupont@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Paris','48.8582','2.3387','homme','homosexuel','65','0')", function (err, result) {});
    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Test','Score','test_score','test_score@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Paris','48.8582','2.3387','homme','bisexuel','33','100')", function (err, result) {});
    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Dubois','Christine','cdubois','cdubois@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Cr&#233;teil','48.790367','2.455572','femme','bisexuel','45','0')", function (err, result) {});
    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Deschamps','Antoine','adeschamps','addfs@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Strasbourg','48.5734053','7.752111299999999','homme','bisexuel','23','0')", function (err, result) {});
    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Garnier','Marie','mgarnier','fdsfsdds@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Paris','48.8582','2.3387','femme','heterosexuel','25','0')", function (err, result) {});
    con.query("INSERT INTO users (nom, prenom, pseudo, email, password, geoloc, geoloc_lat, geoloc_long, sexe, orientation_sexuelle, age, score) VALUES ('Pomme','Louise','lpomme','cdasdsdsa@gmail.com','$2a$10$/YA7CQsAR7D3bfIfmixxse426D.unlXbV4TD6fxoPTA5jqD1u2YKe','Versailles','48.8048649','2.1203554','femme','bisexuel','27','0')", function (err, result) {});


});
