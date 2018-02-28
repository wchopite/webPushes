"use strict";
const express = require("express"),
      webpush = require('web-push'),
      cors = require('cors'),
      bodyParser = require('body-parser'),
      app = express();

app.use(cors());
app.use(bodyParser.json());

const port = 3001,
      pushInterval = 10,
      vapidKeys = {
        publicKey: "xxxxxxxxx",
        privateKey: "xxxxxxxxx"
      };

webpush.setGCMAPIKey('xxxxxxxxxxxxxx');
webpush.setVapidDetails(
  'mailto:info@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// cached subscriptions
let subscriptions = {};

/* UTILITIES */
function isSubscribed(endpoint) {
  return (subscriptions[endpoint] ? true : false);
}
/* UTILITIES */

/* ROUTES */
app.get('/', (req, res) => {
  res.json({status: 'ok'});
});

app.get('/subscriptions', (req, res) => {
  res.json({subscriptions});
});

// Get the vapid key => to clients
app.get('/vapid', (req, res) => {
  res.json({publicKey: vapidKeys.publicKey});
});

// Send the push notification to users
app.post('/sendPush', (req, res) => {
  let body = req.body;

  const pushSubscription = {
    endpoint: body.endpoint,
    keys: {
      auth: body.userAuth,
      p256dh: body.userPublicKey
    }
  };

  webpush.sendNotification(pushSubscription, body.payload)
    .then(() => {
      console.log("sent push");
      res.sendStatus(201);
    }, function(err) {
      console.log('webpusherr', err);
      res.json(500, err);
    });
});

// Register clients to notifications
app.post('/register', (req, res) => {
  let payload = req.body;

  if (!isSubscribed(payload.endpoint)) {
    subscriptions[payload.endpoint] = payload;
  }

  res.send('ok');
});

// Unsubscribe clients from notifications
app.post('/unregister', (req, res) => {
  let endpoint = req.body.endpoint;
  delete subscriptions[endpoint];
  res.json({status: 'ok'});
});
/* ROUTES */

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
