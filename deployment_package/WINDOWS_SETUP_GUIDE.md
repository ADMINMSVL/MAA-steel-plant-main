# Steel Plant ERP - Windows Server Setup Guide

## STEP 1: Install Python (If not installed)

1. Download Python 3.11 from: https://www.python.org/downloads/
2. Run installer
3. **IMPORTANT**: Check "Add Python to PATH" during installation
4. Click "Install Now"

To verify, open Command Prompt and type:
```
python --version
```
Should show: Python 3.11.x

---

## STEP 2: Setup MongoDB Atlas (Free Cloud Database)

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create FREE account (use Google or email)
3. Click "Build a Database"
4. Select "FREE" tier (M0 Sandbox)
5. Choose nearest region (Mumbai for India)
6. Click "Create Cluster" (wait 2-3 minutes)

### Get Connection String:
1. Click "Connect" on your cluster
2. Click "Connect your application"
3. Copy the connection string, it looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```
4. Replace `<password>` with your actual password
5. Save this - you'll need it in Step 4

### Allow Access:
1. Go to "Network Access" (left menu)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for now)
4. Click "Confirm"

---

## STEP 3: Download Backend Files

Create a folder: `C:\SteelPlantERP\`

Put these 3 files inside:
- server.py
- crypto_utils.py
- requirements.txt

---

## STEP 4: Create Environment File

Create a new file: `C:\SteelPlantERP\.env`

Add this content (replace YOUR_MONGODB_URL):
```
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
DB_NAME=steel_plant_erp
```

---

## STEP 5: Install Dependencies

Open Command Prompt as Administrator:
```
cd C:\SteelPlantERP
pip install -r requirements.txt
```

---

## STEP 6: Run the Server

```
cd C:\SteelPlantERP
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

---

## STEP 7: Test the Server

Open browser and go to:
```
http://YOUR_SERVER_IP:8001/api/health
```

Should show: `{"status":"healthy"}`

---

## STEP 8: Open Firewall Port

1. Open "Windows Defender Firewall"
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter: 8001
6. Select "Allow the connection" → Next
7. Check all (Domain, Private, Public) → Next
8. Name it: "Steel Plant ERP" → Finish

---

## STEP 9: Run as Windows Service (Auto-start)

Install NSSM (Non-Sucking Service Manager):
1. Download from: https://nssm.cc/download
2. Extract to C:\nssm\

Open Command Prompt as Administrator:
```
C:\nssm\win64\nssm.exe install SteelPlantERP
```

In the popup:
- Path: C:\Python311\python.exe (your Python path)
- Startup directory: C:\SteelPlantERP
- Arguments: -m uvicorn server:app --host 0.0.0.0 --port 8001

Click "Install service"

Start the service:
```
net start SteelPlantERP
```

---

## STEP 10: Tell Me Your Server IP

Once running, share your server's PUBLIC IP address with me.
I will rebuild the APK to connect to your server.

To find your public IP, open browser and go to: https://whatismyip.com

---

## Troubleshooting

**Python not found:**
- Reinstall Python with "Add to PATH" checked

**MongoDB connection error:**
- Check your connection string in .env
- Ensure IP is whitelisted in MongoDB Atlas

**Port 8001 not accessible:**
- Check Windows Firewall rule
- Check router port forwarding (if behind NAT)

---

## Need Help?

Share any error messages with me and I'll help you fix them!
