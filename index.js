const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config()
const port = 5000
const stripe = require('stripe')('sk_test_51J48PcI49BSRorNv5ke8obc0zxreMRdrZO7Sd5oJHqy3cvI4B0dhRHS62w2GMZvXg9QqwAaaCFKaQsAHMURH022G00O6HywMgZ')



app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())




app.get('/', (req, res) => {
  res.send('Hello World!')
})



const admin = require('firebase-admin')

const serviceAccount = require('./foodbrand-2bed8-firebase-adminsdk-2nlav-c6c35c74b3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})



const verifyToken = async (req, res, next) => {
  if (req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1]
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken)
      req.decodedEmail = decodedToken.email

    } catch (error) {
      console.log(error)
    }
  }
  next()
}


const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://restauranteWeb:IFuYJmiKwOLqFsDw@cluster0.nj4m0.mongodb.net/restaurantebd?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const productCollection = client.db("restaurantebd").collection("addProduct");
  const categoryCollection = client.db("restaurantebd").collection("categoryData");
  const orderCollection = client.db("restaurantebd").collection("orderdata");
  const reviewCollection = client.db("restaurantebd").collection("reviewData");
  const testimonialCollection = client.db("restaurantebd").collection("testimonialData");

  app.post('/addProduct', (req, res) => {
    const productInfo = req.body
    productCollection.insertOne(productInfo)
      .then(result => {
        res.send(result.insertedCount > 0)
        console.log(result)
      })
    console.log(productInfo)
  })

  app.post('/showItem', (req, res) => {
    const data = req.body.title
    productCollection.find({ period: data })
      .toArray((err, documents) => {
        res.send(documents)
        console.log(err)
        console.log(documents)
      })
  })

  app.post('/showItemBySearch', (req, res) => {
    try {
      const search = req.body.name
      const template = req.body.template
      productCollection.find({ period: template, name: { $regex: '.*' + search + '.*' } })
        .toArray((err, item) => {
          console.log(item)
          res.send(item)
        })

    }
    catch (error) {
      console.log(error)
    }
  })


  app.get('/showProduct/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: ObjectId(id) }
    const result = await productCollection.findOne(query)
    res.json(result)
  })


  app.get('/showAllProduct', async (req, res) => {
    const cursor = productCollection.find({})
    const page = req.query.page
    const size = parseInt(req.query.size)
    let products;
    const counted = await cursor.count()
    if (page) {
      products = await cursor.skip(page * size).limit(size).toArray()
    }
    else {
      products = await cursor.toArray()
    }

    res.send({
      counted,
      products
    })
  })

  app.delete('/deleteProduct/:id', async (req, res) => {
    const id = req.params.id
    const deletedId = { _id: ObjectId(id) }
    const result = await productCollection.deleteOne(deletedId)
    res.send(result)
  })

  app.put('/updateProduct/:id', async (req, res) => {
    const update_Id = req.params.id
    const updateData = req.body
    const filter = { _id: ObjectId(update_Id) }
    const options = { upsert: true }
    const updateDoc = {
      $set: updateData
    }

    const result = await productCollection.updateOne(filter, updateDoc, options)
    res.send(result)
    console.log(result)
  })

  //Add product Categories

  app.post('/addCategories', (req,res) =>{
    const data = req.body
    categoryCollection.insertOne(data)
    .then(result =>{
      res.send(result)
      console.log(result)
    })
  })

  app.get('/showCategories' , (req,res) =>{
    categoryCollection.find()
    .toArray((err,categories) =>{
      res.send(categories)
      console.log(categories)
    })
  })


  //Review Collection 

  app.post('/addReview', (req, res) => {
    const data = req.body
    // console.log(data)
    reviewCollection.insertOne(data)
      .then(result => {
        res.send(result.insertedCount > 0)
        console.log(result)
      })
  })

  app.get('/reviewShow/:id', (req,res) =>{
    const id = req.params.id
    const query = {productId: id}
    reviewCollection.find(query)
    .toArray((err,comments) =>{
      res.send(comments)
      console.log(comments)
    })
  })

  //Testimonial Data

  app.post('/addTestimonial',(req,res) =>{
    const data = req.body
    testimonialCollection.insertOne(data)
    .then(result => {
      res.send(result.insertedCount > 0)
      console.log(result)
    } )
  })

  app.get('/showTestimonial',async (req,res) =>{
    const data = testimonialCollection.find()
    const result = await data.toArray()
    res.send(result)
  })

  app.delete('/deleteTestimonial/:id',(req,res) =>{
    const reviewId = req.params.id
    const query = {_id:ObjectId(reviewId)}
    const result = testimonialCollection.deleteOne(query)
    res.send(result)
  })



  //stripe Payment

  app.post('/create-payment-intent', async (req, res) => {

    const paymentInfo = req.body
    const amount = (paymentInfo.price * 100).toFixed(0)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ['card']
    });

    res.json({ clientSecret: paymentIntent.client_secret })
  })


  //Order Info data

  app.post('/orderdata', (req, res) => {
    const orderInfo = req.body
    orderInfo.createdAt = new Date().toLocaleDateString()
    console.log(orderInfo);
    orderCollection.insertOne(orderInfo)
      .then(result => {
        res.send(result.insertedCount > 0)
        // console.log(result)
      })
  })

  app.get('/orderAllShow', async (req, res) => {
    const allOrder = orderCollection.find({})
    const page = req.query.page
    const size = parseInt(req.query.size)
    let allOrderData;
    const counter = await allOrder.count()

    if (page) {
      allOrderData = await allOrder.limit(size).skip(page * size).toArray()
    }
    else {
      allOrderData = await allOrder.toArray()
    }

    res.send({
      counter,
      allOrderData
    })
  })

  app.get('/orderShowByDate', async (req, res) => {
    const date = req.query.date
    orderCollection.find({ createdAt: date })
      .toArray((err, doct) => {
        res.send(doct)
        console.log(doct)
      })
  })

  app.get('/orderShowById/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: ObjectId(id) }
    const result = await orderCollection.findOne(query)
    res.json(result)
  })

  app.get('/orderShowByEmail/:email', async (req, res) => {
    const email = req.params.email
    const result = orderCollection.find({ 'loggedInUser.email': email })
    const data = await result.toArray()
    res.json(data)
    console.log(data)
  })


  app.get('/ordershow', (req, res) => {
    const bearer = req.headers.authorization
    const email = req.query.email

    if (bearer && bearer.startsWith('Bearer ')) {
      const idToken = bearer.split(' ')[1]
      admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
          const decodedTokenEmail = decodedToken.email
          console.log(decodedTokenEmail)

          if (decodedTokenEmail === email) {
            orderCollection.find({ 'loggedInUser.email': email })
              .toArray((err, item) => {
                res.send(item)
                console.log(item)

              })
          }
        })
        .catch((error) => {
          console.log(error)
        })


    }

  })


});





app.listen(port)