var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  port: "3306"
});
var ent = require('ent');
var app = express();
var path    = require("path");
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: 'ssshhhhh',
    resave: true,
    saveUninitialized: true
}));

app.get('/', function(req, res) {
    if(!req.session.login) {
        req.session.login = "";
    } else if (req.session.login) {
        console.log(req.session.login + " " + req.session.email);
    }
    res.render('accueil.ejs');
});

app.get('/connexion/', function(req, res) {
    res.render('inscription.ejs');
});

app.post('/post_inscription/', function(req, res) {
    var nom = ent.encode(req.body.nom);
    var prenom = ent.encode(req.body.prenom);
    var pseudo = ent.encode(req.body.pseudo);
    var email = ent.encode(req.body.email);
    var password = ent.encode(req.body.password);

    con.connect(function(err) {
      if (err) throw err;
      console.log("Connected!");
      con.query("use matcha", function (err, result) {
        if (err) throw err;
        console.log("using db matcha");
      });
      con.query("INSERT INTO users (nom, prenom, pseudo, email, password) VALUES ('"+nom+"','"+prenom+"','"+pseudo+"','"+email+"','"+password+"')", function (err, result) {
        if (err) throw err;
        console.log("users created");
      });
    });
    return res.redirect('/');
});

function getStats(pseudo, cb) {
    con.query("SELECT * FROM USERS WHERE PSEUDO = ?", pseudo,function (err, result) {
        if (err) throw err;
        cb(result);
    });
}

app.post('/post_connexion/', function(req, res) {
    var pseudo = ent.encode(req.body.pseudo);
    var data;

    con.query("use matcha", function (err, result) {
        if (err) throw err;
    });

    getStats(pseudo, function(result){
        data = result;
        req.session.email = data[0].email;
        req.session.login = pseudo;
        res.redirect('/');
    });
});

app.get('/compte/', function(req, res) {
    res.render('compte.ejs');
});

io.sockets.on('connection', function(socket){

    socket.on("mdp_pseudo_connect", function(data){
        var pseudo = ent.encode(data.pseudo);
        var password = ent.encode(data.mdp);
        var test;

        con.query("use matcha", function (err, result) {
            if (err) throw err;
        });
        con.query("SELECT * FROM USERS WHERE PSEUDO = '"+pseudo+"'", function (err, result) {
            if (err) throw err;
            if (result.length && result[0].email) {
                if ((test = result[0].password.localeCompare(password)) == 0) {
                    socket.emit("connection_verification", "oui");
                } else {
                    socket.emit("connection_verification", "non");
                }
            } else {
                socket.emit("connection_verification", "non");
            }
        });
    });
});

http.listen(8080);
