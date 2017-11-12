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
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: 'matchaaa42@gmail.com',
        pass: 'matcha4275'
    }
});
var microtime = require('microtime');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session);
io.use(sharedsession(session));

module.exports = con;
module.exports = session;

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
            res.render('compte.ejs', {session: req.session.login, nom:data[0].nom, prenom:data[0].prenom, email:req.session.email, tags_server:data[0].liste_interet});
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

app.get('/modif_mdp/:key', function (req, res) {
   if (req.params.key != '' && req.session.login && req.params.key != null) {
        getStats(req.session.login, function (result) {
            data = result;
            var key = req.params.key;
            var key_db = data[0].cle_mdp_reset;
            if (key === key_db) {
                res.render('change_mdp.ejs',{session: req.session.login});
            } else {
                res.redirect('/compte');
            }
        });
   } else {
       res.redirect('/compte');
   }
});

app.post('/post_inscription/', function(req, res) {
    var nom = ent.encode(req.body.nom);
    var prenom = ent.encode(req.body.prenom);
    var pseudo = ent.encode(req.body.pseudo);
    var email = ent.encode(req.body.email);
    var password = ent.encode(req.body.password);
    var password2 = ent.encode(hash.sha256().update(password).digest('hex'));
    var ip = ent.encode(req.body.ip_user);
    var city = ent.encode(req.body.city_user);
    var loc = ent.encode(req.body.loc_user);
    var long_lati = loc.split(",");

      con.query("INSERT INTO users (nom, prenom, pseudo, email, password, city, geoloc_lati, geoloc_long, ip) VALUES" +
          " ('"+nom+"','"+prenom+"','"+pseudo+"','"+email+"','"+password2+"', '"+city+"', '"+long_lati[0]+"', " +
          "'"+long_lati[1]+"', '"+ip+"')", function (err, result) {
        if (err) throw err;
      });

    res.redirect('back');
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


    socket.on("verif_modif_mdp", function (data) {
            var password2 = hash.sha256().update(data.pwd1).digest('hex');

            con.query("SELECT password from users WHERE PSEUDO='"+socket.handshake.session.login+"'", function (err, result) {
                if (err) throw err;
                if (password2 === result[0].password) {
                    socket.emit("m_mdp_serveur", "1");
                } else {
                    socket.emit("m_mdp_serveur", "0");
                }
            });
    });

    socket.on("modif_mdp", function (data) {
        if (socket.handshake.session.login) {
            var n = microtime.now();
            var num = n.toString();
            var key = ent.encode(hash.sha256().update(num).digest('hex'));
            con.query("UPDATE users set cle_mdp_reset='"+ key +"' WHERE PSEUDO='"+socket.handshake.session.login+"'", function (err, result) {
               if (err) throw err;
            });
            getStats(socket.handshake.session.login, function(result){
                var data = result;
                var email = data[0].email;
                var mailOptions = {
                    from: '"Assistance Matcha " <noreply_matcha@gmail.com>',
                    to: email,
                    subject: 'Reinitialisation de mot de passe',
                    html: '<b>Bonjour/Bonsoir '+socket.handshake.session.login+' </b><br><br>' +
                    'Une demande de réinitialisation de mot de passe a été demandé sur votre compte ' +
                    'matcha, pour le modifier' +
                    ', clique sur le lien ci dessous.<br><p>' +
                    '<a href="http://localhost:8080/modif_mdp/' + key + '"</a>Cliquez ici pour modifier votre mot de passe</p>'
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if(error){
                        return console.log(error);
                    }
                });
            });
        }
    });

    socket.on("change_mdp_ok", function (data) {
        var pass = data.pwd2;
        var pass2 = hash.sha256().update(pass).digest('hex');

        con.query("UPDATE users set PASSWORD='"+pass2+"', cle_mdp_reset='' WHERE PSEUDO='"+socket.handshake.session.login+"'", function (err, result) {
            if (err) throw err;
        });
        socket.emit("redirect_change_mdp", "/compte");
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

    socket.on("mail_same_vers_serveur", function(data){
        var mail = data.mail;
        con.query("SELECT * FROM USERS WHERE email = ?", mail, function (err, result) {
            if (result[0]) {
                socket.emit("mail_same_vers_client", "1");
            } else {
                socket.emit("mail_same_vers_client", "0");
            }
        });
    });

    socket.on("liste_interets", function(data){
       var li = data.liste_interets;

       con.query("UPDATE users set liste_interet='"+li+"' WHERE pseudo='"+socket.handshake.session.login+"'", function(err, resultat){
           if (err) throw err;
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
