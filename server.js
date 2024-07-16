const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// MongoDB Atlas connection URI
const uri = process.env.MONGODB_URI;
// const uri = "mongodb+srv://<>:<>@cluster0.cepgukq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const secret = process.env.JWT_SECRET; 
// MongoDB client instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let jobCollection;

async function connectToMongoDB() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    // Access the database and collection
    const database = client.db('JobBoard'); 
    jobCollection = database.collection('Job_Db'); 
    userCollection = database.collection('Users')

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Endpoint to get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await jobCollection.find().toArray();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/cryptocurrency', async (req, res) => {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?', {
      params: {
        symbol: 'BTC,ETH,XRP,SOL,USDT',
        convert: 'USD'
    },
      
    headers: {
        'X-CMC_PRO_API_KEY': coinMarketCapApiKey
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching cryptocurrency data:", error);
    res.status(500).json({ message: 'Error fetching cryptocurrency data' });
  }
});



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

// Start MongoDB connection and server
connectToMongoDB().then(() => {
  app.listen(port, () => {
    console.log("Server running on port ${port}");
  });
});