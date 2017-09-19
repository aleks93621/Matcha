var express = require('express');
var session = require('express-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  port: "3307"
});
var ent = require('ent')
var pwdHash = require('bcrypt');
var app = express();
var path    = require("path");

var http = require('http').Server(app);
var io = require('socket.io').listen(http);

var sess;

app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: 'ssshhhhh',
    resave: true,
    saveUninitialized: true
}));

app.use(function(req, res, next) {
    if (typeof(sess) == "undefined") {
        sess = req.session;
    }
    next();
});

app.get('/', function(req, res) {
    if (!sess.pseudo) {
        res.redirect('/connexion');
    } else {
        console.log(sess.pseudo);
        res.sendFile(path.join(__dirname+'/views/accueil.html'));
    }
});

app.get('/connexion/', urlencodedParser, function(req, res) {
    res.sendFile(path.join(__dirname+'/views/inscription.html'));
});

app.post('/post_inscription/', urlencodedParser, function(req, res) {
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

app.post('/post_connexion/', urlencodedParser, function(req, res) {
    var pseudo = ent.encode(req.body.pseudo);
    sess = req.session;
    con.query("use matcha", function (err, result) {
        if (err) throw err;
    });
    con.query("SELECT * FROM USERS WHERE PSEUDO = '"+pseudo+"'", function (err, result) {
        if (err) throw err;
        sess.pseudo = pseudo;
        sess.email = result[0].email;
        sess.iduser = result[0].id;
    });
    return res.redirect('/');
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
