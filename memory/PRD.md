# Steel Plant ERP - Product Requirements Document

## Overview
A comprehensive mobile ERP application for steel plant operations, enabling gate-to-gate management of materials from entry to production.

## Original Problem Statement
Build a mobile application for steel plant processing that tracks materials from gate entry through weighing, quality inspection, and into manufacturing processes.

## Target Users
- Gate Operators (vehicle entry/exit)
- Weighbridge Operators
- Quality Inspectors
- Production Managers
- Plant Administrators

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: Expo React Native
- **Database**: MongoDB (Atlas compatible)
- **Authentication**: PIN-based with bcrypt hashing

## Core Modules

### Phase 1 (Complete)
1. **Authentication** - PIN-based login with user roles
2. **Gate Entry** - Vehicle registration, driver info, material type
3. **Weighbridge** - Manual weight entry, gross/tare/net calculations
4. **Quality Inspection** - Multi-category inspection with rates
5. **Purchase/Sales Orders** - Order management
6. **Reports** - Dashboard statistics
7. **Admin Panel** - Data management, clear logs functionality

### Phase 2 (Complete)
1. **Melting Shop** - Furnace operations, heat tracking, raw material charging
2. **CCM (Billet Casting)** - Billet production, quality grading
3. **Rolling Mill** - TMT production, bundle tracking
4. **Maintenance** - Breakdown reporting, scheduled maintenance

### Phase 3 (Planned)
1. Dispatch Module
2. Sales Realization
3. Tally ERP 9 Integration

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users

### Gate Entry
- GET/POST /api/gate-entry
- GET/DELETE /api/gate-entry/{id}

### Weighbridge
- GET/POST /api/weighbridge
- DELETE /api/weighbridge/{id}

### Quality Inspection
- GET/POST /api/quality-inspection
- DELETE /api/quality-inspection/{id}

### Melting
- GET/POST /api/melting/heat
- GET /api/melting/heat/{id}
- PUT /api/melting/heat/{id}
- GET /api/melting/stats

### CCM
- GET/POST /api/ccm/billet
- GET /api/ccm/billet/{id}
- PUT /api/ccm/billet/{id}/status

### Rolling Mill
- GET/POST /api/rolling/production
- GET /api/rolling/production/{id}
- PUT /api/rolling/production/{id}/status

### Maintenance
- GET/POST /api/maintenance/breakdown
- GET /api/maintenance/breakdown/{id}
- PUT /api/maintenance/breakdown/{id}
- GET/POST /api/maintenance/schedule
- GET /api/maintenance/stats

### Admin
- DELETE /api/admin/clear-all

## Test Credentials
- Username: new_admin
- PIN: 1234
- Role: admin

## Current Status (Feb 2025)
- Backend: 100% Complete and Tested (28/28 tests passing)
- Frontend: Complete, but preview environment has tunnel stability issues
- Phase 1 & 2: Fully implemented
- Phase 3: Not started

## Known Issues
1. **Expo Tunnel Instability** - The preview environment's CI=true setting causes ngrok tunnel timeouts. This is a platform infrastructure issue, not a code issue.
2. **Legacy User Accounts** - Users created before PIN hashing will fail to login (migration needed)

## Fixed Issues (Feb 23, 2025)
1. **Clear All Logs Button** - Fixed the admin panel "Clear All Logs" button that wasn't working. The issue was with the early return logic and double-confirmation. Now works correctly with single confirmation.

## Files Structure
```
/app
├── backend/
│   ├── server.py          # Main API with all endpoints
│   ├── crypto_utils.py    # Password hashing utilities
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (tabs)/        # Main navigation tabs
│   │   ├── melting/       # Melting module screens
│   │   ├── ccm/           # CCM module screens
│   │   ├── rolling/       # Rolling mill screens
│   │   ├── maintenance/   # Maintenance screens
│   │   └── ...
│   └── package.json
└── test_reports/
    └── iteration_1.json   # Test results
```

## Next Actions
1. Address the Expo tunnel stability for reliable preview testing
2. Build APK for distribution to employees
3. Implement Phase 3 modules when required
