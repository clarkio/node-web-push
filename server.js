const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const _ = require('lodash');
const log = console.log;

const app = express();
const port = process.env.PORT || 8626;
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

// TODO: replace email with variable
webPush.setVapidDetails(
  'mailto:brian@clarkio.com',
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
    log('Subscription already stored');
    sendMessage = 'Subscription already stored';
  } else {
    subscriptions.push(body);
    log('Updated subscriptions:', subscriptions);
    sendMessage = 'Subscription stored';
  }
  res.send(sendMessage);
});

app.post('/push', (req, res) => {
  log('Body', req.body);
  // req.body.subscription
  // req.body.notificationMessage
  const pushSubscription = req.body.pushSubscription;
  const notificationMessage = req.body.notificationMessage;
  log('Current subscriptions found', subscriptions);
  log('Notification message:', notificationMessage);

  if (
    pushSubscription &&
    (typeof pushSubscription === 'string' ||
      pushSubscription instanceof String) &&
    pushSubscription.toLocaleLowerCase() === 'all'
  ) {
    if (subscriptions.length) {
      subscriptions.map((subscription, index) => {
        log('Sending notification to subscription:', subscription);
        let jsonSub = JSON.parse(subscription);

        webPush.sendNotification(jsonSub, notificationMessage)
          .then(success => res.send('Push notification published successfully'))
          .catch(error => {
            log(error);
            res.status(400).send(error);
          });
      });
    } else {
      res.send('There are currently no subscribed clients to notify');
    }
  } else {
    log('Sending notification to subscription:', pushSubscription);

    webPush.sendNotification(JSON.parse(pushSubscription), notificationMessage)
      .then(success => res.send('Push notification published successfully'))
      .catch(error => {
        log(error);
        res.status(400).send(error);
      });
  }
});

app.get('/ping', (req, res) => {
  console.log('API is up and running');
  res.send(runningMessage);
});

app.listen(port, () => log(runningMessage));
