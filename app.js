// Import required libraries
require('dotenv').config(); // Load environment variables from .env file into process.env
const Moralis = require('moralis'); // Moralis SDK for interacting with blockchain
const express = require('express'); // Express framework to handle HTTP requests
const helmet = require('helmet'); // Helmet to secure Express apps by setting various HTTP headers
const morgan = require('morgan'); // Morgan for logging HTTP requests
const rateLimit = require('express-rate-limit'); // Rate limiting to prevent abuse

const app = express(); // Create an instance of express
const PORT = process.env.PORT || 3000; // Port number from environment variables or default to 3000

// Rate limiting middleware setup to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Security enhancements using Helmet
app.use(helmet());

// Logging setup with Morgan
app.use(morgan('dev')); // 'dev' format for development. It logs method, url, status, response time, and content length

// Middlewares for parsing JSON and URL-encoded data (comes with Express)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Moralis with server URL and App ID from environment variables
Moralis.start({
  serverUrl: process.env.MORALIS_SERVER_URL,
  appId: process.env.MORALIS_APP_ID
});

// Simple route that is open and does not require authentication
app.get('/', (req, res) => res.send('Hello, API!'));

// Middleware to authenticate API requests
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token || token !== process.env.SECRET_TOKEN) {
    return res.status(403).send('Unauthorized');
  }
  next();
};

// Apply the authentication middleware to all routes defined after this point
app.use(authenticateToken);

// Function to fetch token data using Moralis
async function getTokenData(tokenAddress) {
  const options = { address: tokenAddress, chain: "8453" }; // Configuration for Moralis request
  try {
    const price = await Moralis.Web3API.token.getTokenPrice(options);
    const tokenMetadata = await Moralis.Web3API.token.getTokenMetadata(options);
    return { price: price.usdPrice, metadata: tokenMetadata };
  } catch (error) {
    console.error("Failed to fetch token data:", error);
    return { error: "Failed to fetch token data", details: error };
  }
}

// API endpoint to get token data by token address
app.get('/api/tokenData/:tokenAddress', async (req, res) => {
  const tokenAddress = req.params.tokenAddress;
  try {
    const data = await getTokenData(tokenAddress);
    if (data.error) {
      res.status(500).json(data);
    } else {
      res.json(data);
    }
  } catch (error) {
    res.status(500).send("Error retrieving token data");
  }
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server on the specified port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


