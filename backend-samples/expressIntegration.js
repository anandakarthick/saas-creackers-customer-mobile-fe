/**
 * Sample Express.js integration for FCM notifications
 *
 * This shows how to:
 * 1. Store FCM tokens from devices
 * 2. Send notifications when orders are placed
 * 3. Handle token refresh and cleanup
 *
 * Setup:
 * npm install express firebase-admin body-parser
 */

const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory storage (replace with your database)
const deviceTokens = new Map(); // userId -> [{ fcmToken, deviceId, platform, lastActive }]
const usersByBranch = new Map(); // branchId -> [userId]

// ============== API ENDPOINTS ==============

/**
 * Register/Update device FCM token
 * Called when app starts or token refreshes
 */
app.post('/api/devices/register', async (req, res) => {
  try {
    const { userId, fcmToken, deviceId, platform, branchId } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'userId and fcmToken are required' });
    }

    // Get existing devices for user
    let userDevices = deviceTokens.get(userId) || [];

    // Update or add device
    const existingIndex = userDevices.findIndex((d) => d.deviceId === deviceId);
    const deviceInfo = {
      fcmToken,
      deviceId,
      platform: platform || 'android',
      branchId,
      lastActive: new Date(),
    };

    if (existingIndex >= 0) {
      userDevices[existingIndex] = deviceInfo;
    } else {
      userDevices.push(deviceInfo);
    }

    deviceTokens.set(userId, userDevices);

    // Track users by branch for targeted notifications
    if (branchId) {
      const branchUsers = usersByBranch.get(branchId) || [];
      if (!branchUsers.includes(userId)) {
        branchUsers.push(userId);
        usersByBranch.set(branchId, branchUsers);
      }
    }

    console.log(`✅ Device registered for user ${userId}:`, fcmToken.substring(0, 20) + '...');

    res.json({ success: true, message: 'Device registered' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * Unregister device (logout)
 */
app.post('/api/devices/unregister', async (req, res) => {
  try {
    const { userId, deviceId, fcmToken } = req.body;

    const userDevices = deviceTokens.get(userId) || [];
    const filtered = userDevices.filter(
      (d) => d.deviceId !== deviceId && d.fcmToken !== fcmToken
    );
    deviceTokens.set(userId, filtered);

    console.log(`✅ Device unregistered for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unregistering device:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

/**
 * Create new order and send notification
 */
app.post('/api/orders', async (req, res) => {
  try {
    const { branchId, customerId, customerName, items, total } = req.body;

    // Create order (your database logic here)
    const order = {
      id: `order_${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      branchId,
      customerId,
      customerName,
      items,
      total,
      status: 'pending',
      createdAt: new Date(),
    };

    console.log('📦 New order created:', order.orderNumber);

    // Send notification to branch staff
    await sendOrderNotificationToBranch(branchId, order);

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Send notification to all staff in a branch
 */
async function sendOrderNotificationToBranch(branchId, order) {
  // Get all users in the branch
  const branchUserIds = usersByBranch.get(branchId) || [];

  // Collect all FCM tokens
  const tokens = [];
  branchUserIds.forEach((userId) => {
    const devices = deviceTokens.get(userId) || [];
    devices.forEach((device) => {
      if (device.fcmToken) {
        tokens.push(device.fcmToken);
      }
    });
  });

  if (tokens.length === 0) {
    console.log('⚠️ No devices to notify for branch:', branchId);
    return;
  }

  const message = {
    tokens: tokens,
    notification: {
      title: `🛒 New Order #${order.orderNumber}`,
      body: `${order.customerName} placed an order for ₹${order.total}`,
    },
    data: {
      type: 'order',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: String(order.total),
      branchId: branchId,
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
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Sent to ${response.successCount}/${tokens.length} devices`);

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.log(`❌ Failed:`, resp.error?.message);
        }
      });

      // Clean up invalid tokens
      cleanupInvalidTokens(failedTokens);
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    throw error;
  }
}

/**
 * Send notification to a specific user
 */
async function sendNotificationToUser(userId, title, body, data = {}) {
  const devices = deviceTokens.get(userId) || [];
  const tokens = devices.map((d) => d.fcmToken).filter(Boolean);

  if (tokens.length === 0) {
    console.log('⚠️ No devices for user:', userId);
    return null;
  }

  const message = {
    tokens,
    notification: { title, body },
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

  return admin.messaging().sendEachForMulticast(message);
}

/**
 * Clean up invalid FCM tokens
 */
function cleanupInvalidTokens(invalidTokens) {
  deviceTokens.forEach((devices, userId) => {
    const filtered = devices.filter((d) => !invalidTokens.includes(d.fcmToken));
    if (filtered.length !== devices.length) {
      deviceTokens.set(userId, filtered);
      console.log(`🧹 Cleaned up ${devices.length - filtered.length} invalid tokens for user ${userId}`);
    }
  });
}

/**
 * Send order status update notification
 */
app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, customerId } = req.body;

    const statusMessages = {
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
    };

    const message = statusMessages[status] || `Order status updated to ${status}`;

    // Notify customer
    if (customerId) {
      await sendNotificationToUser(customerId, `Order Update`, message, {
        type: 'order',
        orderId,
        status,
        screen: 'OrderDetails',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ============== START SERVER ==============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/devices/register - Register FCM token`);
  console.log(`  POST /api/devices/unregister - Unregister device`);
  console.log(`  POST /api/orders - Create order and notify`);
  console.log(`  POST /api/orders/:id/status - Update order status\n`);
});
