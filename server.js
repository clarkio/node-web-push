// Pull in dependencies
const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Server settings with ExpressJS
const app = express();
const port = process.env.PORT || 3000;
const runningMessage = 'Server is running on port ' + port;

// Set up custom dependencies
// Constants just contains common messages so they're in one place
const constants = require('./constants');

// VAPID keys should only be generated once.
// use `web-push generate-vapid-keys --json` to generate in terminal
// then export them in your shell with the follow env key names
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Tell web push about our application server
webPush.setVapidDetails(
  'mailto:email@domain.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store subscribers in memory
let subscriptions = [];

// Set up CORS and allow any host for now to test things out
// WARNING! Don't use `*` in production unless you intend to allow all hosts
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// Allow clients to subscribe to this application server for notifications
app.post('/subscribe', (req, res) => {
  const body = JSON.stringify(req.body);
  let sendMessage;
  if (_.includes(subscriptions, body)) {
    sendMessage = constants.messages.SUBSCRIPTION_ALREADY_STORED;
  } else {
    subscriptions.push(body);

    sendMessage = constants.messages.SUBSCRIPTION_STORED;
  }
  res.send(sendMessage);
});

// Allow host to trigger push notifications from the application server
app.post('/push', (req, res, next) => {
  const pushSubscription = req.body.pushSubscription;
  const notificationMessage = req.body.notificationMessage;

  if (!pushSubscription) {
    res.status(400).send(constants.errors.ERROR_SUBSCRIPTION_REQUIRED);
    return next();
  }

  if (subscriptions.length) {
    subscriptions.map((subscription, index) => {
      let jsonSub = JSON.parse(subscription);

      // Use the web-push library to send the notification message to subscribers
      webPush.sendNotification(jsonSub, notificationMessage)
        .then(success => handleSuccess(success, index))
        .catch(error => handleError(error, index));
    });
  } else {
    res.send(constants.messages.NO_SUBSCRIBERS_MESSAGE);
    return next();
  }

  function handleSuccess(success, index) {
    res.send(constants.messages.SINGLE_PUBLISH_SUCCESS_MESSAGE);
    return next();    
  }

  function handleError(error, index) {
    res.status(500).send(constants.errors.ERROR_MULTIPLE_PUBLISH);
    return next();    
  }
});

app.get('/', (req, res) => {
  res.send(runningMessage);
});

app.listen(port, () => console.log(runningMessage));
