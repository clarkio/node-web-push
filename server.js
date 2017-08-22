const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const _ = require('lodash');
const constants = require('./constants');
const log = console.log;

const app = express();
const port = process.env.PORT || 3000;
const runningMessage = 'Server is running on port ' + port;

// TODO: use a key/value vault
// VAPID keys should only be generated once.
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (vapidKeys === undefined) {
  vapidKeys = webPush.generateVAPIDKeys();
}

webPush.setVapidDetails(
  'mailto:email@domain.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let subscriptions = [];

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.post('/subscribe', (req, res) => {
  const body = JSON.stringify(req.body);
  let sendMessage;
  if (_.includes(subscriptions, body)) {
    log(constants.messages.SUBSCRIPTION_ALREADY_STORED);
    sendMessage = constants.messages.SUBSCRIPTION_ALREADY_STORED;
  } else {
    subscriptions.push(body);
    log(constants.messages.UPDATED_SUBSCRIPTIONS, subscriptions);
    sendMessage = constants.messages.SUBSCRIPTION_STORED;
  }
  res.send(sendMessage);
});

app.post('/push', (req, res, next) => {
  const pushSubscription = req.body.pushSubscription;
  const notificationMessage = req.body.notificationMessage;
  let errors = [];
  let successes = [];
  log('Current subscriptions found', subscriptions);
  log('Notification message received:', notificationMessage);

  if (!pushSubscription) {
    res.status(400).send(constants.errors.ERROR_SUBSCRIPTION_REQUIRED);
    return next();
  }

  if ((typeof pushSubscription === 'string' || pushSubscription instanceof String) &&
    pushSubscription.toLocaleLowerCase() === 'all') {
    if (subscriptions.length) {
      subscriptions.map((subscription, index) => {
        log(constants.messages.SENDING_NOTIFICATION_MESSAGE, subscription);
        let jsonSub = JSON.parse(subscription);

        webPush.sendNotification(jsonSub, notificationMessage)
          .then(success => {
            return handleSuccess(success, index);
          })
          .catch(error => {
            return handleError(error, index);
          });
      });
    } else {
      res.send(constants.messages.NO_SUBSCRIBERS_MESSAGE);
      return next();
    }
  } else {
    let subscription
    try { 
      subscription = JSON.parse(pushSubscription);
    } catch(error) {
      return handleError(error, -1);
    }

    log(constants.messages.SENDING_NOTIFICATION_MESSAGE, pushSubscription);

    webPush.sendNotification(subscription, notificationMessage)
      .then(success => {
        return handleSuccess(success, -1);
      })
      .catch(error => {
        return handleError(error, -1);
      });
  }

  function handleSuccess(success, index) {
    successes.push(constants.messages.SINGLE_PUBLISH_SUCCESS_MESSAGE + success);
    if (index === subscriptions.length - 1 || subscriptions.length === 0 || index === -1) {
      return checkNotificationResults();
    }
  }

  function handleError(error, index) {
    log(error);
    errors.push(error);
    if (index === subscriptions.length - 1 || subscriptions.length === 0) {
      return checkNotificationResults();
    }
  }

  function checkNotificationResults() {
    if (errors.length === 0) {
      res.send(constants.messages.MULTIPLE_PUBLISH_SUCCESS_MESSAGE);
    } else {
      res.status(500).send(constants.errors.ERROR_MULTIPLE_PUBLISH);
    }
    return next();
  }
});

app.get('/', (req, res) => {
  log('API is up and running');
  res.send(runningMessage);
});

app.listen(port, () => log(runningMessage));
