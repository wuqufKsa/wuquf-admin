const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { resolve } = require("path");
// Replace if using a different env file or config
const env = require("dotenv").config({ path: "./.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-08-01",
});
const cors = require("cors");
app.use(cors());
app.use(express.static(process.env.STATIC_DIR));
app.use(express.json());
const admin = require("firebase-admin");
const serviceAccount = require("./wuquf-4ea0b-firebase-adminsdk-3c5af-ae176e1e0f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// =============== SING UP ================== //

app.post("/singup", async (req, res) => {
  try{
  const { email, password, phoneNumber, City , nationality, jins, fullname ,photoURL} = req.body;
  const userResponse = await admin.auth().createUser({
    email: email,
    password: password,
    photoURL: photoURL,
    emailVerified: false,
  });
  
  const userJson = {
    id: userResponse.uid,
    fullname: fullname,
    email: email,
    password: password,
    phoneNumber: phoneNumber,
    City:City,
    nationality: nationality,
    jins:jins,
    photoURL:photoURL,
    reservations: [],
    role: ["Customer"]
  }
  const userDatabase = await db.collection("users").doc(userResponse.uid).set(userJson);

  res.json({ data: userJson, massage: "تم إنشاء حساب بنجاح" });
}
catch(err){
  res.status(400).json({massage:err})
}
});



// ============= GET USERS =========== //
app.get("/users", async (req, res) => {
  const responseArr = [];
  const listUsers = (await db.collection("users").get()).forEach((doc) => {
    responseArr.push(doc.data());
  });
  res.json({ data: responseArr });
});

// ============= payment ============== //
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

// ============ create Company =========== //
app.post("/create-company", async (req, res) => {
  try {
    const id = Math.random().toString(16).slice(2);
    const {
      nameCompany,
      countParking,
      Subscription,
      CompanyParking,
      emailCompany,
    } = req.body;
    const CompanyJson = {
      id,
      nameCompany,
      emailCompany,
      countParking,
      Subscription,
      CompanyParking,
    };
    const CompanyRef = await db.collection("compnay").doc(id).set(CompanyJson);
    res.json({ data: CompanyJson, massage: "تمت إضافة شركة بنجاح" });
  } catch (err) {
    res.send(err);
  }
});
// =========== get company =========== //
app.get("/get-company", async (req, res) => {
  try {
    const CompanyRef = db.collection("compnay");
    const response = await CompanyRef.get();
    let responseArr = [];
    response.forEach((doc) => {
      responseArr.push(doc.data());
    });
    res.json(responseArr);
  } catch (err) {
    res.send(err);
  }
});
// ============ get one company ============= //
app.get("/getOne-company/:id", async (req, res) => {
  try {
    const CompanyRef = db.collection("compnay").doc(req.params.id);
    const response = await CompanyRef.get();
    res.json(response.data());
  } catch (err) {
    res.send(err);
  }
});
// =========== update company =============== //
app.post("/update-company/:id", async (req, res) => {
  try {
    const {
      nameCompany,
      countParking,
      Subscription,
      CompanyParkingLocations,
      emailCompany,
    } = req.body;
    const CompanyRef = db.collection("compnay").doc(req.params.id);
    const CompanyJson = {
      nameCompany,
      emailCompany,
      countParking,
      Subscription,
      CompanyParkingLocations,
    };
    const response = await CompanyRef.update(CompanyJson);
    res.json({ massage: "تم تحديث بنجاح ", response });
  } catch (err) {
    res.send(err);
  }
});
// ================ delete company =============== //
app.delete("/delete-company/:id", async (req, res) => {
  try {
    const CompanyRef = db.collection("compnay").doc(req.params.id);
    const response = await CompanyRef.delete();
    res.json({ massage: "تم الحذف بنجاح" });
  } catch (err) {
    res.send(err);
  }
});

// ============ subscripe =========== //
app.post("/subscripe-company/:id", async (req, res) => {
  try {
    const {
      nameCompany,
      countParking,
      Subscription,
      CompanyParkingLocations,
      emailCompany,
      expiresIn,
    } = req.body;
    const token = jwt.sign(
      {
        nameCompany,
        countParking,
        Subscription,
        CompanyParkingLocations,
        emailCompany,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: expiresIn }
    );
    const CompanyRef = db.collection("compnay").doc(req.params.id);
    const response = await CompanyRef.update({ Subscription, token });
    res.json({ massage: "تم الإشتراك بنجاح", token });
  } catch (err) {
    res.send(err);
  }
});

// ========== CREATE Location PARK ========== //

app.post("/create-location-park/:companyId", async (req, res) => {
  const { ParkingLocations } = req.body;
  const companyId = req.params.companyId;
  const id = Math.random().toString(16).slice(2);
  const parkingJson = {
    id: id,
    ParkingLocations,
    Park: [],
  };
  const Parking = await db
    .collection("parking-locations")
    .doc(id)
    .set(parkingJson);
  const getCompanyOne = await db.collection("compnay").doc(companyId).get();
  const Arrid = [];
  Arrid.push(id);
  getCompanyOne.data().CompanyParking.map((item) => Arrid.push(item));
  const CompanyParking = await db.collection("compnay").doc(companyId).update({
    CompanyParking: Arrid,
  });

  res.json({ data: parkingJson, massage: "تم إنشاء مواقف جديدة" });
});

// ========== GET Location PARK =========== //

app.get("/get-parking", async (req, res) => {
  const parking = await db.collection("parking-locations").get();
  const responseArr = [];
  parking.forEach((doc) => {
    responseArr.push(doc.data());
  });

  res.json(responseArr);
});

// ============= FIND ONE Location PARKING ============ //

app.get("/get-parking/:id", async (req, res) => {
  const parking = await db.collection("parking-locations").doc(req.params.id).get();
  res.json(parking.data());
});

// =========== DELETE Location PARKING ========= //
app.delete("/delete-parking/:id", async (req, res) => {
  const ParkingRef = await db.collection("parking-locations").doc(req.params.id).delete();
  res.json({ massage: "تم الحذف بنجاح" });
});

// ========== UPDATE Location PARKING ============ //
app.post("/update-parking/:id", async (req, res) => {
  const { ParkingLocations, Park } = req.body;
  const ParkingRef = await db.collection("parking-locations").doc(req.params.id).update({
    ParkingLocations,
    Park
  });
});

// =========== CREATE PARKING ============ //

app.post("/create-parking/:ParkingId", async(req,res) => {
  const {word, reserve} = req.body;
  const GetParking = await db.collection("parking-locations").doc(req.params.ParkingId).get();
  const id = Math.random().toString(16).slice(2);
  const ArrId = [];
  const ParkJson = {
    id,
    word,
    reserve: "" 
  }

  GetParking.data().Park.map(item=> ArrId.push(item));

   const Park = await db.collection("Parking").doc(id).set(ParkJson);

   ArrId.push(ParkJson.id);

   const createPark = await db.collection("parking-locations").doc(req.params.ParkingId).update({
    Park: ArrId
  })

   res.json({data:ParkJson , massage:"تم إنشاء موقف"});
});


// ============ GET PARK ============ // 
app.get("/get-park" ,  async(req, res) => {
  const GetPark = await db.collection("Parking").get();
  const responseArr = [];
  GetPark.forEach(item=>{
    responseArr.push(item.data());
  })
  res.json({data:responseArr, massage: "تم جلب المعلومات بنجاح"})
});


// ============ DELETE PARK ========== //
app.delete("/delete-park/:ParkId" , async(req,res) => {
  const DeletePark = await db.collection("Parking").doc(req.params.ParkId).delete();
  res.json({massage: "تم حذف بنجاح"});
});

// ============ UPDATE PARK =========== // 

app.post("/update-park/:ParkId", async(req,res) => {
  const {word} = req.body;

  const UpdatePark = await db.collection("Parking").doc(req.params.ParkId).update({
     word
  })
});

// ============ GET RESERVE ============ // 
app.get("/reserve-parking", async(req,res) => {
  const GetReserve = await db.collection("reserve").get();
  const responseArr = [];

  GetReserve.forEach(doc=>{
    responseArr.push(doc.data())
  })

  res.json(responseArr);
})

// =========== Reserve Parking ============ //

app.post("/reserve-parking/:parkId" , async(req,res) => {
    const {userId} = req.body;
    const parkId = req.params.parkId;
    const CreateReserve = await db.collection("reserve").doc(parkId).set({
       userId,
       parkId
    });

    const ReserveInPark = await db.collection("Parking").doc(parkId).update({
      reserve: parkId
    });

    res.json({massage: "تم الحجز بنجاح"});
});



// ============= Reserve Delete =========== //

app.delete("/delete-Reserve/:parkId", async(req,res) =>{
  const DeleteReserve = await db.collection("reserve").doc(req.params.parkId).delete();

  const DeleteReserveINPark = await db.collection("Parking").doc(req.params.parkId).update({
    reserve: ""
  });

 res.json({massage: "تم إلغاء الحجز"});

})


// ============ Reserve UPDATE ============= //

app.post("/update-reserve/:reserveId" , async(req,res)=> {
  const {userId,parkId} = req.body;
  const UpdateReserve = await db.collection("reserve").doc(req.params.reserveId).update({
     userId,
     parkId
  });

  res.json({userId,parkId});  
});


// ========= LISTEN ========== //
app.listen(3000, () => console.log(`http://localhost:3000`));
