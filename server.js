require("dotenv").config()

const http = require('http');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github2');
const crypto = require('crypto');
const server = express();
const { MongoClient, ObjectId } = require("mongodb");
const session = require('express-session')
const MongoStore = require('connect-mongo').default;
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
// IMPORTANT: you must run `npm install` in the directory for this assignment
// to install the mime library if you're testing this on your local machine.
// On Render, make sure `npm install` is your build command.
const publicDir = 'public/';
const port = 3020;

// helper class for the log of operations
class Operation {
  constructor(operator, value, acc) {
    this.operator = operator; //operator used for this operation
    this.value = value; //value used for this operation
    this.acc = acc; //the value of the accumulator after the operation was applied
  }
}

var accumulator = 0;
//var operationLog = [new Operation("plus", 0, 0)];

// MongoDB setup
const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBHOST}`;
// check for sanity
// console.log( 'uri:', uri );
const client = new MongoClient( uri );
let operations = client.db("a3").collection("operations");
let users = client.db("a3").collection("users");



// -----------------------------------
// Data Operations
// -----------------------------------
const sendAllOperations = async function (request, response) {
  response.writeHead(200, "OK", { 'Content-Type': 'application/json' });
  ops = await operations.find({user: request.user}, {sort: { _id: 1 }}).toArray();
  response.end(JSON.stringify(ops));
}

const handleOperationEdit = async function (request, response) {
  var dataString = '';

  request.on('data', function (data) {
    dataString += data
  })

  request.on('end', async function () {
    input = JSON.parse(dataString);
    await operations.updateOne({_id: new ObjectId(input.id)}, {$set: {value: parseInt(input.newValue)}});
    sendAllOperations(request, response);
  })
}

const handleOperationDelete = async function (request, response) {
  var dataString = '';

  request.on('data', function (data) {
    dataString += data
  })

  request.on('end', async function () {
    input = JSON.parse(dataString);
    await operations.deleteOne({_id: new ObjectId(input.id)});
    sendAllOperations(request, response);
  })
}

const handleOperationSubmit = async function (request, response) {
  var dataString = ''

  request.on('data', function (data) {
    dataString += data
  })

  request.on('end', async function () {
    let input;
    try {
      input = JSON.parse(dataString)
    } catch {
      sendValidationError(response, "Invalid JSON");
      return;
    }
    // validate operator is add subtract multiply or divide
    if (!(["plus", "minus", "times", "divide"].includes(input.operator))) {
      sendValidationError(response, "Unsupported operation");
      return;
    }
    // validate value is a real number
    // the null part is because https://wtfjs.com/wtfs/2013-04-28-isfinite-null-is-true
    if (!Number.isFinite(input.value) || input.value === null) {
      sendValidationError(response, "Value is not a number");
      return;
    }
    // avoid dividing by zero
    if (input.operator === "divide") {
      if (input.value === 0) {
        sendValidationError(response, "Attempted to divide by zero")
        return;
      }
    }
    // add the operation to the database
    await operations.insertOne({operator: input.operator, value: input.value, user: request.user});

    sendAllOperations(request, response);
  })
}

const sendValidationError = function (response, errorMessage) {
  response.writeHead(422, "Unprocessable Content", { 'Content-Type': 'text/plain' });
  response.end(errorMessage);
}



// --------------------
// Authentication/session management
// --------------------
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new LocalStrategy(async function verify(username, password, cb) {
  let user = await users.findOne({username: username});
  if (!user) {
    return cb(null, false, { message: 'Incorrect username or password.' });
  }
  crypto.pbkdf2(password, user.salt.buffer, 310000, 32, 'sha256', function(err, hashedPassword) {
      if (err) { return cb(err); }
      if (!crypto.timingSafeEqual(user.hashed_password.buffer, hashedPassword)) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user);
    });  
}));

passport.use(new GitHubStrategy({
    clientID: `${process.env.GITHUB_CLIENT_ID}`,
    clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
    callbackURL: "http://127.0.0.1:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

server.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
        client: client,
        collectionName: 'users' 
      })
}));
server.use(passport.authenticate('session'));

// create a test user for debugging

// create an initial user (username: tester, password: password)
(async () => {
var password_salt = crypto.randomBytes(16);
var user = await users.findOne({username: "tester"});
if (!user){
  users.insertOne({username: "tester", hashed_password: crypto.pbkdf2Sync('password', password_salt, 310000, 32, 'sha256'), salt: password_salt});
  console.log("added test user")
} else {
  console.log("test user already added")
}
})()






// -------------------
// Other Middleware
// -------------------

// necessary to make passport work
server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use(cookieParser());

// set username cookie so the browser can show who you're logged in as
server.use((req, res, next) => {
  if (req.user) {
    res.cookie("username", req.user.username);
  } else {
    res.clearCookie("username");
  }
  next();
});



// ------------------
// Routing
// ------------------

server.get('/login', (req, res) => {
  res.sendFile(path.resolve("public/login.html")); //TODO use publicDir variable
});

server.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

server.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

server.get('/', ensureLogIn(), (req, res) => {
  res.sendFile(path.resolve("public/index.html")); //TODO use publicDir variable
});

server.get("/data", ensureLogIn(), async (request, response) => {
  sendAllOperations(request, response);
})

server.post("/submit", ensureLogIn(), (request, response) => {
  handleOperationSubmit(request, response);
})

server.post("/delete", ensureLogIn(), (request, response) => {
  handleOperationDelete(request, response);
})

server.post("/edit", ensureLogIn(), (request, response) => {
  handleOperationEdit(request, response);
})

server.post('/login/password', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

server.post('/logout', ensureLogIn(), function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// serve static files
server.use("/", express.static(publicDir));


server.listen(process.env.PORT || port)
