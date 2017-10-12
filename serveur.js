var express = require('express');
var session = require('express-session')({
    secret: 'ssshhhhh',
    resave: true,
    saveUninitialized: true
});
var bodyParser = require('body-parser');
var db = require('./config/database');
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "matcha",
  port: "3306"
});
var ent = require('ent');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var sharedsession = require("express-socket.io-session");
var hash = require('hash.js');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session);
io.use(sharedsession(session));

function getStats(pseudo, cb) {
    con.query("SELECT * FROM USERS WHERE PSEUDO = ?", pseudo,function (err, result) {
        if (err) throw err;
        cb(result);
    });
}

app.get('/', function(req, res) {
    res.render('accueil.ejs', {session: req.session.login});
});

app.get('/connexion/', function(req, res) {
    res.render('inscription.ejs', {session: req.session.login});
});

app.get('/inscription/', function(req, res) {
    res.render('inscription.ejs', {session: req.session.login});
});

app.get('/compte/', function(req, res) {
    if (req.session.login) {
        getStats(req.session.login, function(result){
            data = result;
            res.render('compte.ejs', {session: req.session.login, nom:data[0].nom, prenom:data[0].prenom, email:req.session.email});
        });
    } else {
        res.redirect('/connexion');
    }
});


app.get('/deconnexion/', function(req, res) {
    if (req.session.login) {
        con.query("UPDATE users set actif=0 WHERE pseudo = ?", req.session.login, function (err, resultat) {
            if (err) throw err;
        });
        req.session.email = "";
        req.session.login = "";
        req.session.idUser = "";
    }
    res.redirect('back');
});

app.post('/post_inscription/', function(req, res) {
    var nom = ent.encode(req.body.nom);
    var prenom = ent.encode(req.body.prenom);
    var pseudo = ent.encode(req.body.pseudo);
    var email = ent.encode(req.body.email);
    var password = ent.encode(req.body.password);
    var password = ent.encode(hash.sha256().update(req.body.password).digest('hex'));

      con.query("INSERT INTO users (nom, prenom, pseudo, email, password) VALUES ('"+nom+"','"+prenom+"','"+pseudo+"','"+email+"','"+password+"')", function (err, result) {
        if (err) throw err;
      });
    return res.redirect('/inscription/');
});

app.post('/post_connexion/', function(req, res) {
    var pseudo = ent.encode(req.body.pseudo);
    var data;
    con.query("UPDATE users set actif=1 WHERE pseudo = ?", pseudo, function(err, resultat){
       if (err) throw err;
    });

    getStats(pseudo, function(result){
        data = result;
        req.session.email = data[0].email;
        req.session.login = pseudo;
        req.session.idUser = data[0].id;
        res.redirect('/');
    });
});

app.all('*', function(req, res) {
    res.redirect("/");
});

io.sockets.on('connection', function(socket){

    if(socket.handshake.session.login) {
        con.query("UPDATE users set actif=1 WHERE pseudo = ?", socket.handshake.session.login, function(err, resultat){
            if (err) throw err;
        });
    }
    socket.on("mdp_pseudo_connect", function(data){
        var pseudo = ent.encode(data.pseudo);
        var password = ent.encode(data.mdp);
        var pwd2 = hash.sha256().update(password).digest('hex');
        var test;

        con.query("use matcha", function (err, result) {
            if (err) throw err;
        });
        con.query("SELECT * FROM USERS WHERE PSEUDO = '"+pseudo+"'", function (err, result) {
            if (err) throw err;
            if (result.length && result[0].email) {
                if ((test = result[0].password.localeCompare(pwd2)) == 0) {
                    socket.emit("connection_verification", "oui");
                } else {
                    socket.emit("connection_verification", "non");
                }
            } else {
                socket.emit("connection_verification", "non");
            }
        });
    });

    socket.on("pseudo_same_vers_serveur", function(data){
        var pseudo = data.pseudo;
        con.query("SELECT * FROM USERS WHERE pseudo = ?", pseudo, function (err, result) {
            if (result[0]) {
                socket.emit("pseudo_same_vers_client", "1");
            } else {
                socket.emit("pseudo_same_vers_client", "0");
            }
        });
    });

    socket.on('disconnect', function () {
        if(socket.handshake.session.login) {
            con.query("UPDATE users set actif=0 WHERE pseudo = ?", socket.handshake.session.login, function (err, resultat) {
                if (err) throw err;
            });
            socket.emit('disconnected');
        }
    });
});

http.listen(8080);
