var express = require('express');
var cookieParser = require('cookie-parser')();
var session = require("express-session")({
    secret: "my-secret",
    resave: false,
    saveUninitialized: false,
});
var sharedsession = require("express-socket.io-session");
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var db = require('./config/database');
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "matcha"
});
var ent = require('ent');
var bcrypt = require('bcrypt');
var app = express();
var path = require("path");

var http = require('http').Server(app);
var io = require('socket.io')(http);
var clients = [];
var sess;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fileUpload = require('express-fileupload');
var fs = require('fs');
var latinize = require('latinize');
var geolocator = require('geolocator');
var nodemailer = require('nodemailer');

function countTags(login) {
  con.connect(function(err) {
      con.query("SELECT * FROM users WHERE pseudo = '"+login+"'", function (err, user) {
        var tmp = user[0].liste_interet.split(',');
        var count = 0;
        con.query("SELECT * FROM users WHERE pseudo != '"+login+"'", function (err, result) {
          result.forEach(function(elem){
            count = 0;
            tmp.forEach(function(tag){
              if (elem.liste_interet.indexOf(tag) >= 0){
                count++;
              }
            });
            con.query("UPDATE users SET tags = '"+count+"' WHERE id = '"+elem.id+"' ", function (err, result) {
            });
        });
      });
    });
  });
}

function calcDist(login) {
  con.connect(function(err) {
      con.query("SELECT * FROM users WHERE pseudo = '"+login+"'", function (err, user) {
        var orig_lat = user[0].geoloc_lat;
        var orig_long = user[0].geoloc_long;
        var dist = 0;
        con.query("SELECT * FROM users WHERE pseudo != '"+login+"'", function (err, result) {
          result.forEach(function(elem){
              if (elem.geoloc_lat == 0 || elem.geoloc_long == 0) {
                dist = -1;
              }
              else {
                dist = geolocator.calcDistance({
                    from: {
                        latitude: orig_lat,
                        longitude: orig_long
                    },
                    to: {
                        latitude: elem.geoloc_lat,
                        longitude: elem.geoloc_long
                    },
                    formula: geolocator.DistanceFormula.HAVERSINE,
                    unitSystem: geolocator.UnitSystem.METRIC
                });
              }
            con.query("UPDATE users SET dist = '"+dist+"' WHERE id = '"+elem.id+"' ", function (err, result) {
            });
        });
      });
    });
  });
}

app.use(session)

.use(fileUpload())
.use(express.static(__dirname + '/public'))
.use(cookieParser)
.use(function(req, res, next){
    sess = req.session;
    if (!sess.login || sess.login == '') {
        req.session.login = '';
    }
    next();
})

.get('/', function(req, res) {
   if (req.session.login == '') {
      return res.redirect('/connexion');
    }
    var sort = req.query.sort;
    var desc = req.query.desc;
    var age = req.query.age;
    var loc = req.query.loc;
    var score = req.query.pop;
    var tag = req.query.tag;

    var condition = "";
    var tri = "";

    // SI 0 PARAMS --> REMPLIR AUTOMATIQUEMENT POUR MEILLEURE NAV
    if (!sort && !age && !loc && !score && !tag){
      sort = "tags";
      loc = 25;
    }
    ///////////////////

    // GESTION TRI
    if (sort == 'age' || sort == 'dist' || sort == 'score' || sort == 'tags') {
      tri = "ORDER BY "+sort;
      if (sort === "age") {
        tri = "AND age > 0 " + tri;
      }
      if (desc === '1') {
        tri = tri + " DESC";
      }
    }

    if (sort === "tags") {
      countTags(req.session.login);
    }
    if (sort === "dist") {
      calcDist(req.session.login);
    }
    ////////////////

    // GESTION CONDITION
    if (age && age.split('_')[0] && age.split('_')[1]) {
      condition = condition + " AND age >= "+(isNaN(parseInt(age.split('_')[0])) ? 18 : parseInt(age.split('_')[0]))+" AND age <= "+(isNaN(parseInt(age.split('_')[1])) ? 100 : parseInt(age.split('_')[1]));
    }
    if (score && score.split('_')[0] && score.split('_')[1]) {
      condition = condition + " AND score >= "+(isNaN(parseInt(score.split('_')[0])) ? 0 : parseInt(score.split('_')[0]))+" AND score <= "+(isNaN(parseInt(score.split('_')[1])) ? 100 : parseInt(score.split('_')[1]));
    }
    if (tag) {
      countTags(req.session.login);
      condition = condition + " AND tags >= "+(isNaN(parseInt(tag)) ? 0 : parseInt(tag))+" ";
    }
    if (loc) {
      calcDist(req.session.login);
      condition = condition + " AND dist < "+(isNaN(parseInt(loc)) ? 25 : parseInt(loc))+" ";
    }
    ////////////////
    con.connect(function(err) {
        con.query("SELECT * FROM users WHERE pseudo != '"+req.session.login+"' "+condition+" "+tri+"", function (err, result) {
          if (err) throw err;
          con.query("SELECT * FROM users WHERE pseudo = '"+req.session.login+"'", function (err, result1) {
            con.query("SELECT * FROM likes WHERE (id_un = '"+req.session.id_db+"' AND like_deux = 2) OR (id_un = '"+req.session.id_db+"' AND like_un = 2) ", function (err, report) {
            report.forEach(function(rep){
              if(rep.like_un == 2){
                result.splice(result.findIndex(x => x.id==rep.id_deux),1);
              }
              if(rep.like_deux == 2){
                result.splice(result.findIndex(x => x.id==rep.id_un),1);
              }
            });
            if (err) throw err;
            result.forEach(function(elem){
              if(elem.bio) {
                elem.bio = ent.decode(elem.bio);
              }
              elem.pseudo = ent.decode(elem.pseudo);
              elem.nom = ent.decode(elem.nom);
              elem.prenom = ent.decode(elem.prenom);
              if(elem.geoloc) {
                elem.geoloc = ent.decode(elem.geoloc);
              }
              if(elem.liste_interet) {
                elem.liste_interet = ent.decode(elem.liste_interet);
              }
            });

            for(var i = 0; i < result.length; i++){
              if(result[i].sexe === 'neutre') {
                result.splice(result.indexOf(result[i]),1);
              }
              else if(result1[0].sexe === "femme") {
                if(result1[0].orientation_sexuelle === "heterosexuel") {
                  if(result[i].sexe === "femme" || result[i].orientation_sexuelle === "homosexuel"){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
                else if(result1[0].orientation_sexuelle === "homosexuel") {
                  if(result[i].sexe === "homme" || result[i].orientation_sexuelle === "heterosexuel"){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
                else if(result1[0].orientation_sexuelle === "bisexuel") {
                  if((result[i].sexe === "homme" && result[i].orientation_sexuelle === "homosexuel") || (result[i].sexe === "femme" && result[i].orientation_sexuelle === "heterosexuel")){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
              }
              else if(result1[0].sexe === "homme") {
                if(result1[0].orientation_sexuelle === "heterosexuel") {
                  if(result[i].sexe === "homme" || result[i].orientation_sexuelle === "homosexuel"){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
                else if(result1[0].orientation_sexuelle === "homosexuel") {
                  if(result[i].sexe === "femme" || result[i].orientation_sexuelle === "heterosexuel"){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
                else if(result1[0].orientation_sexuelle === "bisexuel") {
                  if((result[i].sexe === "femme" && result[i].orientation_sexuelle === "homosexuel") || (result[i].sexe === "homme" && result[i].orientation_sexuelle === "heterosexuel")){
                    result.splice(result.indexOf(result[i]),1);
                    i--;
                  }
                }
              }
            };
            res.render('accueil.ejs', {data: result, nb: result.length});
          });


          });


        });
    });
})

.get('/connexion/', urlencodedParser, function(req, res) {
      res.sendFile(path.join(__dirname+'/views/inscription.html'));
});

io.use(function(socket, next) {
    var req = socket.handshake;
    var res = {};
    cookieParser(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
});

function arrayContains(needle, arrhaystack) {
    return (arrhaystack.indexOf(needle) > -1);
}

function getGeoloc() {
    var requestify = require('requestify');
    requestify.get('https://db-ip.com/81.57.53.204').then(function(response) {
        response.getBody();
        var patt = new RegExp("located in ([^,]+), ([^.]+) \\(see map\\)");
        var res = patt.exec(response.body);
        req.session.geoloc = "TEST42";
    });
}

io.on('connection', function(socket){
    var socketList = io.sockets.server.eio.clients;
    var socketIds = Object.keys(socketList);

    if (socket.handshake.session.login) {
        if (socket.handshake.session.login != '') {
            clients.unshift(socket.id+"/"+socket.handshake.session.login);
        }
    }
    for (i = 0; i < clients.length; i++) {
        if (!arrayContains(clients[i].split('/')[0], socketIds)) {
            clients.splice(i, 1);
            i--;
        }
    };
  socket.on('clic_connexion', function (data) {
      var pseudo = ent.encode(data.pseudo);
      var password = data.mdp;
      con.connect(function(err) {
          con.query("SELECT * FROM users WHERE pseudo = '"+pseudo+"' ", function (err, result) {

            if (typeof result !== 'undefined' && result.length > 0) {
            bcrypt.compare(password, result[0].password, function(err, resPwd) {


              if (typeof result !== 'undefined' && result.length > 0 && resPwd) {
                  var sql = "UPDATE users SET geoloc = '"+data.loc+"', geoloc_lat = '"+data.lat+"', geoloc_long = '"+data.long+"' WHERE pseudo = '"+pseudo+"' ";
                  con.query(sql, function (err, result) {
                      if (err) throw err;
                  });
                  io.emit('connexion_true');
              }
              else {
                  io.emit('connexion_false');
              }
            });
          }
          else {
              io.emit('connexion_false');
          }

          });
      });
    });
    socket.on('clic_reset', function (data) {
        var email = ent.encode(data.email);
        var key = ent.encode(data.key);
        con.connect(function(err) {
            con.query("SELECT * FROM users WHERE email = '"+email+"' AND key_pwd = '"+key+"' AND key_pwd !='no_key'", function (err, result) {
              if (typeof result !== 'undefined' && result.length > 0) {
                var salt = bcrypt.genSaltSync(10);
                var password = bcrypt.hashSync(data.mdp, salt);
                var sql = "UPDATE users SET key_pwd = 'no_key', password = '"+password+"' WHERE email = '"+email+"' ";
                con.query(sql, function (err, result) {
                    if (err) throw err;
                });
                io.emit('reset_true');
              }
              else {
                io.emit('reset_false');
              }
            });
        });
      });
      socket.on('clic_oubli', function (data) {
          var email = ent.encode(data.email);
            var transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'matchaservice2017@gmail.com',
                pass: 'racingclub67'
              }
            });
            con.connect(function(err) {
              con.query("SELECT * FROM users WHERE email = '"+email+"'", function (err, result) {
                if (err) throw err;
                if (typeof result !== 'undefined' && result.length > 0) {
                  var tmp = new Date();
                  var salt = bcrypt.genSaltSync(10);
                  var key = bcrypt.hashSync(tmp.getTime().toString(), salt);
                  con.query("UPDATE users SET key_pwd = '"+key.substr(key.length - 10)+"' WHERE email = '"+email+"'", function (err, result) {
                    if (err) throw err;
                  });
                  var mailOptions = {
                    from: 'matchaservice2017@gmail.com',
                    to: result[0].email,
                    subject: 'Changer de mot de passe',
                    html: '<p>Pour changer de mot de passe, cliquez sur le lien suivant http://localhost:8080/reset_pwd avec le code suivant '+key.substr(key.length - 10)+'</p>'
                  };
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                    } else {
                    }
                  });
                  io.emit('reset_sent');
                }
                else{
                  io.emit('reset_notsent');
                }
              });
            });
        });
    socket.on('read_message', function(dest) {
        var dest = ent.encode(dest);
        var user = socket.handshake.session.login;
        con.connect(function(err) {
            var sql = "UPDATE messages SET vu = 1 WHERE id_src = (SELECT  id FROM users WHERE pseudo = '"+dest+"') AND id_user = (SELECT  id FROM users WHERE pseudo = '"+user+"')";
            con.query(sql, function (err, result) {
                if (err) throw err;
            });
        });
    });
    socket.on('new_message', function(mess, dest) {
        var mess = ent.encode(mess);
        var dest = ent.encode(dest);
        var user = socket.handshake.session.login;
        var today = new Date();
        var date = today.getDate()+"/"+(today.getMonth()+1)+"/"+today.getFullYear();
        con.connect(function(err) {
            var sql = "INSERT INTO messages (id_src, id_user, content, date) VALUES ((SELECT  id FROM users WHERE pseudo = '"+user+"'), (SELECT  id FROM users WHERE pseudo = '"+dest+"'), '" + mess + "', '" + date + "' )";
            con.query(sql, function (err, result) {
            });
            io.sockets.emit('test_message', user, dest, mess);
        });
    });
  socket.on('retour_test', function(user, dest, mess) {
      if (socket.handshake.session.login === dest) {
          socket.emit('message', user, mess);
      }
      if (socket.handshake.session.login === user) {
          socket.emit('own_message', user, dest, mess);
      }
  });
  socket.on('check_notifs', function(){
    var notifs = 0;
    var new_message = 0;
    notifAff(socket.handshake.session.id_db, function(nb, new_mess){
        notifs = nb;
        new_message = new_mess;
        if (nb > 0 && new_message > 0) {
          socket.emit('notif', 22);
        }
        else if (nb > 0) {
          socket.emit('notif', 0);
        }
        else if (new_message > 0) {
          socket.emit('notif', 4);
        }
    });
  });
  socket.on('notifs_io', function(id_src, id_user, type) {
    con.connect(function(err) {
        var sql3 = "SELECT * FROM likes WHERE id_un = '"+id_user+"' AND like_un = '2' OR id_deux = '"+id_user+"' AND like_deux = '2' ";
        con.query(sql3, function (err, result3) {
          if (err) throw err;
          if (result3.length === 0) {
            var sql2 = "SELECT * FROM notifs WHERE id_user = '"+id_user+"' AND id_src='"+id_src+"' AND type = '2' AND vu = '0'";
            con.query(sql2, function (err, result2) {
              if (result2.length === 0 || type !== 2) {
                var sql = "INSERT INTO notifs (id_user, type, id_src) VALUES ('"+id_user+"','"+type+"','"+id_src+"')";
                con.query(sql, function (err, result) {
                });
                io.sockets.emit('test_notifs', id_user, type);
              }
            });
          }
        });
    });
  });
  socket.on('retour_test_notifs', function(id_user, type) {
      if (socket.handshake.session.id_db === parseInt(id_user)) {
          socket.emit('notif', type);
      }
  });
  socket.on('suppr_photo', function(photo) {
    photo = __dirname + '/public/photos/' + photo.split('"')[1];
    fs.unlink(photo, function (err) {
    });
  });
  socket.on('add_like', function(id_un, id_deux, val) {
    con.connect(function(err) {
        var sql2 = "SELECT * FROM likes WHERE (id_un = '"+id_un+"' AND id_deux = '"+id_deux+"') OR (id_un = '"+id_deux+"' AND id_deux = '"+id_un+"')";
        con.query(sql2, function (err, result2) {
          if (!result2[0]) {
            var sql = "INSERT INTO likes (id_un, like_un, id_deux, like_deux) VALUES ('"+id_un+"', '"+val+"', '"+id_deux+"', 0)";
            con.query(sql, function (err, result) {
              if (err) throw err;
            });
            socket.emit('liked');
          }
          else {
            socket.emit('re-like', val);
          }
        });

      });
    });
  socket.on('update_like', function(id_un, id_deux, val) {
    con.connect(function(err) {
        var sql = "UPDATE likes SET like_un = '"+val+"' WHERE id_un = '"+id_un+"' AND id_deux = '"+id_deux+"'";
        con.query(sql, function (err, result) {
          if (err) throw err;
        });
        var sql = "UPDATE likes SET like_deux = '"+val+"' WHERE id_un = '"+id_deux+"' AND id_deux = '"+id_un+"'";
        con.query(sql, function (err, result) {
          if (err) throw err;
        });
        socket.emit('liked');
    });
  });
  socket.on('report', function(id) {
    con.connect(function(err) {
        var sql = "UPDATE users SET report = report + 1 WHERE id = '"+id+"'";
        con.query(sql, function (err, result) {
          if (err) throw err;
        });
    });
  });
    socket.on('modif_compte', function(unique, sexe, orsex, bio, pseudo, prenom, nom, email, geoloc, lat, long, age) {
        var login = socket.handshake.session.login;
        var unique = ent.encode(unique);
        var sexe = ent.encode(sexe);
        var orsex = ent.encode(orsex);
        var bio = ent.encode(bio);
        var pseudo = latinize(pseudo);
        var pseudo = ent.encode(pseudo);
        var prenom = ent.encode(prenom);
        var nom = ent.encode(nom);
        var email = ent.encode(email);
        var geoloc = ent.encode(geoloc);
        var lat = lat;
        var long = long;
        var age = age;
        con.connect(function(err) {
            con.query("SELECT * FROM users WHERE id != (SELECT id FROM users WHERE pseudo = '"+login+"') AND pseudo = '"+pseudo+"'", function (err, result) {
                if (err) throw err;
                if (result.length > 0) {
                    socket.emit('ko_pseudo');
                }
                else {
                    con.query("SELECT * FROM users WHERE id != (SELECT id FROM users WHERE pseudo = '"+ login+ "') AND email = '"+email+"'", function (err, result2) {
                        if (err) throw err;
                        if (result2.length > 0) {
                            socket.emit('ko_email');
                        }
                        else {
                            if (geoloc == "aaleksov") {
                                var sql = "UPDATE users SET email = '" + email + "', pseudo = '" + pseudo + "', nom = '" + nom + "', prenom = '" + prenom + "', " +
                                    "sexe = '" + sexe + "', orientation_sexuelle = '" + orsex + "', bio = '" + bio + "', liste_interet = '" + unique + "', age = '" + age + "' " +
                                    "WHERE pseudo = '" + login + "' ";
                            }
                            else {
                                var sql = "UPDATE users SET email = '" + email + "', pseudo = '" + pseudo + "', nom = '" + nom + "', prenom = '" + prenom + "', " +
                                    "sexe = '" + sexe + "', orientation_sexuelle = '" + orsex + "', bio = '" + bio + "', liste_interet = '" + unique + "', geoloc = '" + geoloc + "', geoloc_lat = '" + lat + "', geoloc_long = '" + long + "', age = '" + age + "' " +
                                    "WHERE pseudo = '" + login + "' ";
                            }
                            con.query(sql, function (err, result) {
                                if (err) throw err;
                                if (login !== pseudo) {
                                    socket.handshake.session.login = pseudo;
                                    socket.handshake.session.save();
                                }
                            });
                            socket.emit('ok_compte');
                        }
                    });
                }
            });
        });
    });
  socket.on('notif_justread', function() {
      var user = socket.handshake.session.login;
      con.connect(function(err) {
          var sql = "UPDATE notifs SET vu = 1 WHERE id_user = (SELECT id FROM users WHERE pseudo = '"+user+"')";
          con.query(sql, function (err, result) {
          });
      });
  });
});

app.post('/upload/', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(__dirname + '/public/photos/' + req.session.id_db + '-' + req.body.optradio + '.jpg', function(err) {
    if (err)
      return res.status(500).send(err);

      return res.redirect('/compte');
  });
});

app.post('/post_inscription/', urlencodedParser, function(req, res) {
    var nom = ent.encode(req.body.nom);
    var prenom = ent.encode(req.body.prenom);
    var pseudo = latinize(pseudo);
    var pseudo = ent.encode(req.body.pseudo);
    var email = ent.encode(req.body.email);

    var salt = bcrypt.genSaltSync(10);
    var password = bcrypt.hashSync(req.body.password, salt);
    bcrypt.compare(req.body.password, '$2a$10$yaU4uCDuJNncZmpwYJWS0OD1CjddQ71e./exGt9n6qY7amfUNGMMC', function(err, res) {
    });
    var checkmail = "vide";
    con.connect(function(err) {
      con.query("SELECT * FROM users WHERE email = '"+email+"' OR pseudo =  '"+pseudo+"'", function (err, result, fields) {
          if (err) throw err;
          if (result.length === 0) {
              con.query("INSERT INTO users (nom, prenom, pseudo, email, password) VALUES ('" + nom + "','" + prenom + "','" + pseudo + "','" + email + "','" + password + "')", function (err, result) {
                  if (err) throw err;
              });
              return res.redirect('/');
          }
          else {
              con.query("SELECT * FROM users WHERE email =  '"+email+"'", function (err, result, fields) {
                  if (err) throw err;
                  if (result.length > 0) {
                      return res.redirect('/connexion?checkmail=invalide');
                  }
                  else {
                      return res.redirect('/connexion?checkmail=invalide2');
                  }
              })
          }
      });
  });
})

.post('/post_connexion/', urlencodedParser, function(req, res) {
  var pseudo = ent.encode(req.body.pseudo1);
  var password = req.body.mdp11;
    con.connect(function(err) {
    con.query("SELECT * FROM users WHERE pseudo = '"+pseudo+"'", function (err, result) {
      if(result[0]) {
        bcrypt.compare(password, result[0].password, function(err, resPwd) {
          if (typeof result !== 'undefined' && result.length > 0 && resPwd) {
              req.session.login = pseudo;
              req.session.id_db = result[0].id;
              var today = new Date();
              var date = today.getDate()+"/"+(today.getMonth()+1)+"/"+today.getFullYear();
              con.query("UPDATE users SET date_conn = '"+date+"' WHERE pseudo = '"+pseudo+"' ");
              return res.redirect('/');
              }
          else {
            return res.redirect('/connexion');
          }
        });
      }
      else {
        return res.redirect('/');
      }
    });
  });
})

.get('/post_deconnexion/', urlencodedParser, function(req, res) {
    req.session.login = '';
    return res.redirect('/connexion');
});

var notifAff = function (id, callback) {
    con.connect(function(err) {
        con.query("SELECT * FROM notifs WHERE vu = 0 AND id_user = '"+id+"' AND type != 4", function (err, result) {
          if (err) throw err;
          con.query("SELECT * FROM messages WHERE vu = 0 AND id_user = '"+id+"'", function (err, result2) {
            if (err) throw err;
            var tmp1 = (!result) ? 0 : result.length;
            var tmp2 = (!result2) ? 0 : result2.length;
            callback(tmp1, tmp2);
          });
        });
    });
};

app.get('/chat/', urlencodedParser, function(req, res) {
    var match = [];
    if (req.session.login == '') {
        return res.redirect('/connexion');
    }
    con.connect(function(err) {
        con.query("SELECT id_un, id_deux, users.id, users.pseudo FROM likes "+
            "INNER JOIN users ON (likes.id_un = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"') AND likes.id_deux = users.id)"+
                            "OR (likes.id_deux = (SELECT id FROM users WHERE users.pseudo = '"+req.session.login+"') AND likes.id_un = users.id)"+
            "WHERE like_un = '1' AND like_deux = '1' AND users.pseudo != '"+req.session.login+"'", function (err, result, fields) {
            if (err) throw err;
            result.forEach(function(element) {
                match.push([element.pseudo, element.id]);
            });
            match.sort();
            con.query("SELECT users.pseudo, messages.content, messages.vu, CASE WHEN users.pseudo = '"+req.session.login+"' THEN (SELECT pseudo FROM users WHERE id = id_user) ELSE users.pseudo END AS test FROM messages "+
                "INNER JOIN users ON messages.id_src = users.id "+
                "WHERE messages.id_src = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"') OR id_user = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"') "+
                "", function (err, res2) {
                if (err) throw err;
                var notifs = 0;
                var new_message = 0;
                notifAff(req.session.id_db, function(nb, new_mess){
                    notifs = nb;
                    new_message = new_mess;
                    res.render('chat.ejs', {user: req.session.login, mess: res2, tab: match, notif: notifs, newmess: new_mess, id_user: req.session.id_db});
                });
            });
        });
    });
});

app.get('/notifs/', urlencodedParser, function(req, res) {
  if (req.session.login == '') {
      return res.redirect('/connexion');
  }
    con.connect(function(err) {
        con.query("SELECT type, vu, id_src, users.id, users.pseudo FROM notifs INNER JOIN users ON notifs.id_src = users.id WHERE notifs.id_user = '"+req.session.id_db+"' ORDER BY notifs.id DESC", function (err, result) {
            if (err) throw err;
            var notifs = 0;
            notifAff(req.session.login, function(nb){
                notifs = nb;
                res.render('notifs.ejs', {notif: notifs, data : result});
            });
        });
    });
});

app.get('/compte/', urlencodedParser, function(req, res) {
    if (req.session.login == '') {
        return res.redirect('/connexion');
    }
    else {
        con.connect(function(err) {
            con.query("SELECT * FROM users WHERE pseudo = '"+req.session.login+"'", function (err, result) {
                con.query("SELECT users.pseudo FROM likes " +
                    "INNER JOIN users ON (users.id = likes.id_un AND likes.id_un != (SELECT id FROM users WHERE pseudo = '"+req.session.login+"')) " +
                    "OR (users.id = likes.id_deux AND likes.id_deux != (SELECT id FROM users WHERE pseudo = '"+req.session.login+"'))" +
                    "WHERE like_un = 1 AND id_deux = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"') " +
                    "OR like_deux = 1 AND id_un = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"')", function (err, result2) {
                    if (err) throw err;
                    con.query("SELECT users.pseudo FROM notifs INNER JOIN users ON users.id = id_src WHERE id_user = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"')", function (err, result3) {
                        var notifs = 0;
                        notifAff(req.session.login, function(nb){
                            notifs = nb;
                            fs.readdir(__dirname + '/public/photos', function(err, files) {
                                if (err) return;
                                files.sort();
                                var count = 0;
                                for(var i = 0; i < files.length; ++i){
                                  if(parseInt(files[i].split('-')[0]) === req.session.id_db)
                                      count++;
                                }
                                var view =[];
                                result3.forEach(function(elem){
                                  view.push(elem.pseudo);
                                });
                                view = view.filter(function(elem, index, self) {
                                    return index == self.indexOf(elem);
                                })
                                if(result[0].bio) {
                                  result[0].bio = ent.decode(result[0].bio);
                                }
                                result[0].pseudo = ent.decode(result[0].pseudo);
                                result[0].nom = ent.decode(result[0].nom);
                                result[0].prenom = ent.decode(result[0].prenom);
                                result[0].geoloc = ent.decode(result[0].geoloc);
                                if(result[0].liste_interet) {
                                  result[0].liste_interet = ent.decode(result[0].liste_interet);
                                }
                                var score = (result[0].bio !== null ? 1 : 0) * 20
                                            + (result[0].sexe !== 'neutre' ? 1 : 0) * 16
                                            + (result[0].liste_interet !== null ? 1 : 0) * 20
                                            + count * 6
                                            + (result2.length < 10 ? result2.length : 10) * 2;
                                var sql = "UPDATE users SET score = '"+score+"' WHERE id = '"+req.session.id_db+"'";
                                con.query(sql, function (err, result) {
                                });
                                res.render('compte.ejs', {notif:notifs, data:result, likes:result2, views: view, pics: files, score2: parseInt(score)});
                            });
                        });
                    });
                });
            });
        });
    }
});

app.get('/profil/:aff_pseudo', urlencodedParser, function(req, res) {
    if (req.session.login == '') {
        return res.redirect('/connexion');
    }
    else if (req.params.aff_pseudo === req.session.login) {
        return res.redirect('/compte');
    }
    else {
        con.connect(function(err) {
            con.query("SELECT * FROM users WHERE pseudo = '"+req.session.login+"'", function (err, result) {
              con.query("SELECT * FROM users WHERE pseudo = '"+req.params.aff_pseudo+"'", function (err, result_visit) {
                if (!result_visit[0]) {
                  return res.redirect('/');
                }
                else {
                con.query("SELECT * FROM likes WHERE (id_un = '"+req.session.id_db+"' AND id_deux = (SELECT id FROM users WHERE pseudo = '"+req.params.aff_pseudo+"')) OR (id_deux = '"+req.session.id_db+"' AND id_un = (SELECT id FROM users WHERE pseudo = '"+req.params.aff_pseudo+"'))" +
                    "", function (err, result2) {
                     if (err) throw err;
                    con.query("SELECT users.pseudo FROM notifs INNER JOIN users ON users.id = id_src WHERE id_user = (SELECT id FROM users WHERE pseudo = '"+req.session.login+"')", function (err, result3) {
                        var notifs = 0;
                        notifAff(req.session.login, function(nb){
                            notifs = nb;
                            fs.readdir(__dirname + '/public/photos', function(err, files) {
                                if (err) return;
                                files.sort();
                                var count = 0;
                                for(var i = 0; i < files.length; ++i){
                                  if(parseInt(files[i].split('-')[0]) === req.session.id_db)
                                      count++;
                                }
                                if(result_visit[0].bio) {
                                  result_visit[0].bio = ent.decode(result_visit[0].bio);
                                }
                                result_visit[0].pseudo = ent.decode(result_visit[0].pseudo);
                                result_visit[0].nom = ent.decode(result_visit[0].nom);
                                result_visit[0].prenom = ent.decode(result_visit[0].prenom);
                                if(result_visit[0].geoloc) {
                                  result_visit[0].geoloc = ent.decode(result_visit[0].geoloc);
                                }
                                if(result_visit[0].liste_interet) {
                                  result_visit[0].liste_interet = ent.decode(result_visit[0].liste_interet);
                                }
                                var connected = 0;
                                clients.forEach(function(elem){
                                  if(elem.split('/')[1] === req.params.aff_pseudo) {
                                    connected = 1;
                                  }
                                });
                                res.render('profil.ejs', {notif:notifs, data:result, data_visit: result_visit, likes:result2, views: result3, pics: files, connected: connected});
                            });
                        });
                    });
                  });
                }
                });
            });
        });
    }
});

app.get('/send_password/', urlencodedParser, function(req, res) {
  if (req.session.login == '') {
      return res.redirect('/connexion');
  }

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'matchaservice2017@gmail.com',
      pass: 'racingclub67'
    }
  });

  con.connect(function(err) {
    con.query("SELECT * FROM users WHERE id = '"+req.session.id_db+"'", function (err, result) {
      if (err) throw err;

      var tmp = new Date();
      var salt = bcrypt.genSaltSync(10);
      var key = bcrypt.hashSync(tmp.getTime().toString(), salt);
      con.query("UPDATE users SET key_pwd = '"+key.substr(key.length - 10)+"' WHERE id = '"+req.session.id_db+"'", function (err, result) {
        if (err) throw err;
      });
      var mailOptions = {
        from: 'matchaservice2017@gmail.com',
        to: result[0].email,
        subject: 'Changer de mot de passe',
        html: '<p>Pour changer de mot de passe, cliquez sur le lien suivant http://localhost:8080/reset_pwd avec le code suivant '+key.substr(key.length - 10)+'</p>'
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        } else {
        }
      });
      return res.redirect('/');

    });
  });
});

app.get('/reset_pwd/', urlencodedParser, function(req, res) {
  res.render('reset_pwd.ejs');
});

app.all('*', function(req, res) {
    res.redirect("/");
});

http.listen(8080);
