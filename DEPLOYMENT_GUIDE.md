# Steel Plant ERP - Deployment Guide

## Overview
This is a full-stack Steel Plant ERP application with:
- **Frontend**: Expo React Native (Mobile + Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

## 1. Save to GitHub

1. Click **"Save"** button in Emergent (top-right)
2. Connect your GitHub account
3. Select/create repository
4. Push to `main` branch

---

## 2. Build APK with EAS

### Prerequisites
After saving to GitHub, on your local machine:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/frontend

# Install dependencies
npm install

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

### Build APK

```bash
# For development/testing APK
eas build --platform android --profile development

# For preview APK (recommended for distribution)
eas build --platform android --profile preview

# For production (Play Store)
eas build --platform android --profile production
```

### Download APK
After build completes, EAS will provide a download link for your APK file.

---

## 3. Deploy Backend

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repo
3. Select `/backend` folder
4. Add environment variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `DB_NAME`: steel_plant_db

### Option B: Self-Hosted (For Data Ownership)

```bash
# On your Linux server
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="steel_plant_db"

# Run with uvicorn
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Using Docker
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 4. Deploy MongoDB

### Option A: MongoDB Atlas (Cloud)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Update `MONGO_URL` in backend

### Option B: Self-Hosted
```bash
# Install MongoDB on Ubuntu
sudo apt install mongodb

# Start service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

---

## 5. Update Frontend for Production

Before building APK, update the backend URL:

```bash
# frontend/.env
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

---

## 6. Distribute APK

### Direct Distribution
- Share APK file directly via:
  - WhatsApp
  - Email
  - Google Drive
  - Internal company portal

### Play Store (Optional)
1. Create Google Play Developer account ($25 one-time)
2. Build with `production` profile
3. Upload to Play Console

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── crypto_utils.py    # Encryption utilities
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend config
├── frontend/
│   ├── app/              # Expo Router screens
│   │   ├── (tabs)/       # Tab navigation
│   │   ├── melting/      # Melting module
│   │   ├── ccm/          # Billet casting
│   │   ├── rolling/      # Rolling mill
│   │   ├── maintenance/  # Breakdown & PM
│   │   └── ...
│   ├── contexts/         # React contexts
│   ├── app.json          # Expo config
│   ├── eas.json          # EAS Build config
│   └── package.json
└── DEPLOYMENT_GUIDE.md
```

---

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=steel_plant_db
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

---

## Support

For issues or questions, check:
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [FastAPI Docs](https://fastapi.tiangolo.com)
