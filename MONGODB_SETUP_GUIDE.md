# MongoDB Setup Guide for Stock Wisely

## Option 1: MongoDB Atlas (Recommended - Free)

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/atlas/database
   - Click "Try Free" and create an account
   - Choose "Shared" (free) cluster

2. **Create Cluster:**
   - Choose your preferred cloud provider (AWS, Google Cloud, or Azure)
   - Select the free tier (M0)
   - Choose a region close to you
   - Name your cluster (e.g., "stock-wisely")

3. **Create Database User:**
   - Go to "Database Access" in the left menu
   - Click "Add New Database User"
   - Create a username and password (save these!)
   - Give "Read and write to any database" permissions

4. **Whitelist Your IP:**
   - Go to "Network Access" in the left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development

5. **Get Connection String:**
   - Go to "Database" in the left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (starts with `mongodb+srv://`)

6. **Update Your .env File:**
   Replace the MONGODB_URI in your `.env` file with:
   ```
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/stock-wisely?retryWrites=true&w=majority
   ```

## Option 2: Local MongoDB Installation

### For Windows:
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will start automatically as a Windows service
4. The default connection string is: `mongodb://localhost:27017/stock-wisely`

### For macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### For Linux:
```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## Test Your Connection

Once you have MongoDB running (either locally or Atlas), test the connection:

1. **Start Backend Server:**
   ```bash
   cd backend
   npm start
   ```

2. **Check for "MongoDB connected successfully" message**

3. **Test Account Creation:**
   - Open your frontend at http://localhost:3000
   - Try creating a new account

## Troubleshooting

### If MongoDB Atlas connection fails:
- Double-check your username and password
- Ensure your IP is whitelisted
- Check if your cluster is running (Atlas free tier may pause after inactivity)

### If local MongoDB fails:
- Check if MongoDB service is running
- Try restarting the MongoDB service
- Check Windows Services (services.msc) for MongoDB service

## Next Steps

Once MongoDB is connected:
1. Test account creation
2. Test Google OAuth (update your Google OAuth credentials in .env)
3. Test the complete authentication flow