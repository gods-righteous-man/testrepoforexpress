
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: 'http://localhost:3000', // Update this to the actual URL of your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

const uri = process.env.MONGODB_URI || 'your-mongodb-uri';
const secret = process.env.JWT_SECRET || 'your_jwt_secret';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let jobCollection;
let userCollection;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db('JobBoard');
    jobCollection = database.collection('Job_Db');
    userCollection = database.collection('Users');
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userCollection.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/addJobs', authenticateToken, async (req, res) => {
  const { title, company, location, url } = req.body;
  try {
    await jobCollection.insertOne({ title, company, location, url });
    res.status(201).json({ message: 'Job posted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/jobs', async (req, res) => {
    try {
      const jobs = await jobCollection.find().toArray();
      res.json(jobs);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

connectToMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

