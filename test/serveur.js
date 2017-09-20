var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var ent = require('ent');
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'shshsshshhs',
    resave: true,
    saveUninitialized: true
}));

app.get('/', function(req, res){
   if (!req.session.userName) {
        req.session.userName = "";
       res.status(201).send(req.session);
   } else {
       res.status(200).send(req.session);
   }
});

app.post('/post-connection', function (req, res) {
    var pseudo = ent.encode(req.body.pseudo);
    var pass = ent.encode(req.body.pwd);

    req.session.userName = pseudo;
    req.session.pass = pass;
    res.redirect('/');
});

app.get('/connection', function(req, res){
   res.render('connection.ejs');
});

app.get('/changeUserName', function(req, res){
    req.session.userName = "tg frr";
    res.redirect('/');
});

app.listen(3000, function () {
   console.log("Listening on port 3000");
});