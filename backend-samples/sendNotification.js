/**
 * Sample Node.js script to send FCM notifications
 *
 * Setup:
 * 1. npm install firebase-admin
 * 2. Download serviceAccountKey.json from Firebase Console
 *    (Project Settings > Service Accounts > Generate new private key)
 * 3. Replace 'YOUR_FCM_TOKEN' with actual device token
 *
 * Usage:
 * node sendNotification.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Replace with path to your service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send order notification to a specific device
 */
async function sendOrderNotification(fcmToken, orderData) {
  const message = {
    token: fcmToken,
    notification: {
      title: `🛒 New Order #${orderData.orderNumber}`,
      body: `${orderData.customerName} placed an order for ₹${orderData.total}`,
    },
    data: {
      type: 'order',
      orderId: String(orderData.orderId),
      orderNumber: String(orderData.orderNumber),
      customerName: orderData.customerName,
      total: String(orderData.total),
      screen: 'OrderDetails',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      ttl: 3600 * 1000, // 1 hour
      notification: {
        channelId: 'orders_channel',
        sound: 'notification_sound', // Custom sound file name (without extension)
        priority: 'high',
        defaultVibrateTimings: true,
        icon: 'ic_launcher',
        color: '#DC2626',
        tag: `order_${orderData.orderId}`, // Replaces previous notification with same tag
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple devices
 */
async function sendToMultipleDevices(fcmTokens, orderData) {
  const message = {
    tokens: fcmTokens,
    notification: {
      title: `🛒 New Order #${orderData.orderNumber}`,
      body: `${orderData.customerName} - ₹${orderData.total}`,
    },
    data: {
      type: 'order',
      orderId: String(orderData.orderId),
      orderNumber: String(orderData.orderNumber),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_channel',
        sound: 'notification_sound',
        priority: 'high',
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ ${response.successCount}/${fcmTokens.length} notifications sent`);

    // Log failed tokens for cleanup
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`❌ Failed token [${idx}]:`, fcmTokens[idx], resp.error?.message);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Send notification to a topic (all subscribed devices)
 */
async function sendToTopic(topic, title, body, data = {}) {
  const message = {
    topic: topic,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      type: data.type || 'system',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: data.type === 'order' ? 'orders_channel' : 'default',
        sound: data.type === 'order' ? 'notification_sound' : 'default',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`✅ Topic notification sent to "${topic}":`, response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Send low stock alert
 */
async function sendLowStockAlert(fcmTokens, productData) {
  const message = {
    tokens: fcmTokens,
    notification: {
      title: '⚠️ Low Stock Alert',
      body: `${productData.name} is running low (${productData.currentStock} remaining)`,
    },
    data: {
      type: 'stock',
      productId: String(productData.productId),
      productName: productData.name,
      currentStock: String(productData.currentStock),
      screen: 'ProductDetails',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'stock_channel',
        icon: 'ic_launcher',
        color: '#F59E0B',
      },
    },
  };

  return admin.messaging().sendEachForMulticast(message);
}

// ============== EXAMPLE USAGE ==============

// Test with your FCM token
const TEST_FCM_TOKEN = 'YOUR_FCM_TOKEN_HERE';

// Sample order data
const sampleOrder = {
  orderId: '12345',
  orderNumber: 'ORD-2024-001',
  customerName: 'John Doe',
  total: 2500,
  items: 5,
};

// Run test
async function runTest() {
  console.log('\n🚀 Sending test notification...\n');

  if (TEST_FCM_TOKEN === 'YOUR_FCM_TOKEN_HERE') {
    console.log('⚠️  Please replace TEST_FCM_TOKEN with an actual FCM token');
    console.log('   You can get the token from the mobile app logs or notification store');
    return;
  }

  await sendOrderNotification(TEST_FCM_TOKEN, sampleOrder);
}

// Export functions for use in your backend
module.exports = {
  sendOrderNotification,
  sendToMultipleDevices,
  sendToTopic,
  sendLowStockAlert,
};

// Run test if executed directly
if (require.main === module) {
  runTest().then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  });
}
