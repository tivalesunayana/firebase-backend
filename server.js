const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const firebaseAdmin = require("firebase-admin");
const path = require("./firebase-messaging-sw");
const serviceAccount = require("./mern-52470-firebase-adminsdk-l1j75-15b11fbeb4.json");

const FCM = require("fcm-node");

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://mern-52470-default-rtdb.firebaseio.com/",
});
// const auth = getAuth(firebaseAdmin);

const messaging = firebaseAdmin.messaging();

mongoose.connect("mongodb://localhost:27017/userdata", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", {
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  enableNotifications: { type: Boolean, default: false },
  fcmToken: { type: String },
});

app.post("/api/register", async (req, res) => {
  try {
    const { userId, email, name } = req.body;
    const user = new User({ userId, email, name });
    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ error: "An error occurred." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.header("Content-Type", "application/javascript");
  res.sendFile("path_to_firebase-messaging-sw.js");
});
app.post("/api/notification-preferences", async (req, res) => {
  try {
    const { userId, enableNotifications } = req.body;

    const user = await User.findOne({ userId });

    if (user) {
      user.enableNotifications = enableNotifications;
      await user.save();
      res.status(200).json({ message: "Notification preferences updated" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/api/send-notification", async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    const user = await User.findOne({ userId });

    if (user && user.enableNotifications && user.fcmToken) {
      const message = {
        token: user.fcmToken,
        notification: {
          title,
          body,
        },
      };

      await messaging.send(message);

      res.status(200).json({ message: "Notification sent successfully" });
    } else {
      res.status(200).json({ message: "User not eligible for notifications" });
    }
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

const sendPushNotification = (fcmToken, message) => {
  const serverKey =
    "AAAAv57KQ2g:APA91bFup6qW85bvSVtpZHQ3qGZR2kIPIdwDNOwm4KJlOcZ-ltGkV9hF3MkaNBRxliiHsxaeao6Ai5xguuO56R8fRkRpxrvL1w9LSIC8QgJlfocKJz4DwskJzqYOxFGuD_NXjIJB-Qw0"; // Replace with your FCM server key
  const fcm = new FCM(serverKey);

  const pushMessage = {
    to: fcmToken,
    notification: {
      title: "Push Notification",
      body: message,
    },
  };

  fcm.send(pushMessage, (err, response) => {
    if (err) {
      console.log("Something has gone wrong!", err);
    } else {
      console.log("Push notification sent.", response);
    }
  });
};

app.post("/api/send-push-notification", async (req, res) => {
  try {
    const { userId, message } = req.body;

    const user = await User.findOne({ userId });

    if (user && user.enableNotifications && user.fcmToken) {
      sendPushNotification(user.fcmToken, message);
      res.status(200).json({ message: "Push notification sent successfully" });
    } else {
      res.status(400).json({ error: "User not eligible for notifications" });
    }
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
