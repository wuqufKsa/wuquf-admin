const express = require("express");
const app = express();
const { resolve } = require("path");
// Replace if using a different env file or config
const env = require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-08-01",
});
const cors = require("cors");
app.use(cors());
app.use(express.static(process.env.STATIC_DIR));
app.use(express.json())

const admin = require("firebase-admin");

const serviceAccount = require("./wuquf-4ea0b-firebase-adminsdk-3c5af-d8de590b07.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


app.post("/singup" , async (req,res)=>{
  console.log(req.body);
  const {email,password} = req.body
  const userResponse = await admin.auth().createUser({
    email: email,
    password: password,
    emailVerified: false
  })

  res.json(userResponse);
  
})

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});


app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "EUR",
      amount: 1999,
      automatic_payment_methods: { enabled: true },
    });

    // Send publishable key and PaymentIntent details to client
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.listen(3000, () =>
  console.log(`http://localhost:3000`)
);


