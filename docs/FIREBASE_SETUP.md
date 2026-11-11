# Firebase Cloud Messaging Setup Guide

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps
3. Once created, click on the Android icon to add an Android app
4. Enter package name: `com.saasmobile`
5. Download `google-services.json`
6. Replace the placeholder file at: `android/app/google-services.json`

## 2. Add Custom Notification Sound

1. Create your notification sound file (MP3 or WAV, max 30 seconds recommended)
2. Name it `notification_sound.mp3`
3. Place it in: `android/app/src/main/res/raw/notification_sound.mp3`

## 3. Get FCM Server Key (for backend)

1. In Firebase Console, go to Project Settings > Cloud Messaging
2. Copy the "Server key" (Legacy) or use Firebase Admin SDK

## 4. Backend Integration

### Option A: Using Firebase Admin SDK (Recommended)

```javascript
// Install: npm install firebase-admin

const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

// Send notification to specific device
async function sendOrderNotification(fcmToken, orderData) {
  const message = {
    token: fcmToken,
    notification: {
      title: 'New Order Received! 🛒',
      body: `Order #${orderData.orderNumber} - ${orderData.customerName} - ₹${orderData.total}`,
    },
    data: {
      type: 'order',
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      screen: 'OrderDetails',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_channel',
        sound: 'notification_sound',
        priority: 'high',
        defaultVibrateTimings: true,
        icon: 'ic_launcher',
        color: '#DC2626',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Send to multiple devices
async function sendToMultipleDevices(tokens, orderData) {
  const message = {
    tokens: tokens,
    notification: {
      title: 'New Order Received! 🛒',
      body: `Order #${orderData.orderNumber} - ₹${orderData.total}`,
    },
    data: {
      type: 'order',
      orderId: orderData.orderId,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_channel',
        sound: 'notification_sound',
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`${response.successCount} messages sent successfully`);
  return response;
}

// Send to topic (all subscribed devices)
async function sendToTopic(topic, orderData) {
  const message = {
    topic: topic, // e.g., 'orders'
    notification: {
      title: 'New Order Alert',
      body: `Order #${orderData.orderNumber} received`,
    },
    data: {
      type: 'order',
      orderId: orderData.orderId,
    },
    android: {
      notification: {
        channelId: 'orders_channel',
        sound: 'notification_sound',
      },
    },
  };

  return admin.messaging().send(message);
}
```

### Option B: Using HTTP v1 API directly

```javascript
const axios = require('axios');
const { google } = require('googleapis');

async function getAccessToken() {
  const key = require('./serviceAccountKey.json');
  const jwtClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/firebase.messaging']
  );
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

async function sendNotification(fcmToken, title, body, data) {
  const accessToken = await getAccessToken();
  const projectId = 'YOUR_PROJECT_ID';

  const response = await axios.post(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      message: {
        token: fcmToken,
        notification: { title, body },
        data: data,
        android: {
          priority: 'high',
          notification: {
            channel_id: 'orders_channel',
            sound: 'notification_sound',
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
```

## 5. Store FCM Tokens

When a user logs in or the app starts, the FCM token is generated. You need to:

1. Send the token to your backend API
2. Store it associated with the user/device

```javascript
// Example API endpoint (Express.js)
app.post('/api/devices/register', async (req, res) => {
  const { userId, fcmToken, deviceInfo } = req.body;

  await db.collection('devices').upsert({
    where: { fcmToken },
    update: { userId, fcmToken, deviceInfo, updatedAt: new Date() },
    create: { userId, fcmToken, deviceInfo, createdAt: new Date() },
  });

  res.json({ success: true });
});
```

## 6. Mobile App: Send Token to Backend

In your React Native app, after getting the FCM token:

```typescript
// In your auth flow or app initialization
import { useNotificationStore } from '@/store';
import { api } from '@/services/api';

const registerDevice = async () => {
  const fcmToken = useNotificationStore.getState().fcmToken;

  if (fcmToken) {
    await api.post('/devices/register', {
      fcmToken,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      },
    });
  }
};
```

## 7. Notification Types

| Type | Channel | Sound | Use Case |
|------|---------|-------|----------|
| order | orders_channel | notification_sound | New orders |
| stock | stock_channel | default | Low stock alerts |
| promotion | promo_channel | default | Marketing notifications |
| system | default | default | System updates |

## 8. Testing

### Test from Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select "Single device" and paste your FCM token
5. Click "Send test message"

### Test from command line
```bash
curl -X POST \
  'https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": {
        "title": "Test Order",
        "body": "Order #12345 received"
      },
      "android": {
        "notification": {
          "channel_id": "orders_channel",
          "sound": "notification_sound"
        }
      }
    }
  }'
```

## 9. Troubleshooting

### Notification not received
- Check if FCM token is valid
- Verify google-services.json is correct
- Check if app has notification permissions
- Ensure device has internet connection

### Custom sound not playing
- Sound file must be in `res/raw/` folder
- Sound filename in message must match (without extension)
- File must be less than 30 seconds
- Rebuild the app after adding sound file

### Token refresh issues
- The app automatically handles token refresh
- Make sure to update the token on your backend when it changes
