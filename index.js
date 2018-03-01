var subscriptionButton = document.getElementById('subscriptionButton'),
    backendURL = "https://example.com",
    atcode = "test";

/* UTILITIES FUNCTIONS */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function generateKey(keyName, subscription) {
  var rawKey;
  rawKey = subscription.getKey ? subscription.getKey(keyName) : '';
  return rawKey ?
      btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) :
      '';
}

function generatePublicKey(subscription) {
  return Promise.resolve(generateKey('p256dh', subscription));
}

function generateAuthKey(subscription) {
  return Promise.resolve(generateKey('auth', subscription));
}
/* UTILITIES FUNCTIONS */

function getSubscription() {
  return navigator.serviceWorker.ready
    .then(function (registration) {
      return registration.pushManager.getSubscription();
    })
    .catch( function (err) {
      console.log(err);
    })
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('serviceWorker.js')
    .then(function() {
      console.log('service worker registered');
      subscriptionButton.removeAttribute('disabled');
    });
  getSubscription()
    .then(function(subscription) {
      if (subscription) {
        console.log('Already subscribed', subscription.endpoint);
        setUnsubscribeButton();
      } else {
        console.log('Ready to get the subscription');
        setSubscribeButton();
      }
    });
}

function subscribe() {
  return new Promise(function(resolve, reject) {
    const permissionResult = Notification.requestPermission(function(result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  })
  .then(function(permissionResult) {
    if (permissionResult !== 'granted') {
      throw new Error('We weren\'t granted permission.');
    }

    return fetch(backendURL+'/atcodes/' + atcode + '/vapid', {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then(function (response) { return response.json(); })
      .then(function(vapidKey) {
        navigator.serviceWorker.ready.then(function(registration) {
          var options = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
          };
          return registration.pushManager.subscribe(options);
        }).then(function(subscription) {
          return Promise.all([
            generatePublicKey(subscription),
            generateAuthKey(subscription),
            subscription
          ]);
        })
        .then(function([userPublicKey, userAuthKey, subscription]) {
          console.log('Endpoint', subscription.endpoint);
          return fetch(backendURL+'/atcodes/' + atcode + '/push', {
            method: 'post',
            headers: { 
              'Content-type': 'application/json',
              'Cookie': 'xxxxxxxxxx'
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              userKey: userPublicKey,
              regId: userAuthKey,
              os: 'Web'
            })
          });
        })
        .then(setUnsubscribeButton)
        .catch( function(err) {
          console.log(err);
        })
      });
  });
}

function unsubscribe() {
  getSubscription().then(function(subscription) {
    console.log("ENDPOINT", subscription.endpoint);
    return subscription.unsubscribe()
      .then(function() {
        return fetch(backendURL + '/atcodes/' + atcode + '/push', {
          method: 'delete',
          headers: {
            'Content-type': 'application/json',
            'Cookie': 'xxxxxxxxxx'
          },
          body: JSON.stringify({
            os: 'Web',
            regId: "userAuthKeyXXXXXXXXXX"
          })
        });
      });
  }).then(setSubscribeButton);
}

function setSubscribeButton() {
  subscriptionButton.onclick = subscribe;
  subscriptionButton.textContent = 'Subscribe!';
}

function setUnsubscribeButton() {
  subscriptionButton.onclick = unsubscribe;
  subscriptionButton.textContent = 'Unsubscribe!';
}
