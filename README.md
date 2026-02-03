# LUIT Clean Water (UI Idea #02)

**🌐 Live Website:** https://luit-clean-water-plum.vercel.app/

A comprehensive water quality monitoring and management system for tracking contaminated water bodies and coordinating between PHCs (Public Health Centers) and Water Treatment Labs across Assam.

## Features

### Public Features
- **Landing Page**: View water quality status, active reports, and reported issues
- **Area Status Popup**: Get real-time status of your area's water quality (clean/contaminated)
- **Report Issue**: Submit contamination reports with GPS location, severity, and source type
- **Statistics**: View total reports, active issues, and clean areas

### PHC Dashboard
- **Active Reports**: View all contamination reports in your district
- **Send to Lab**: Forward reports to water treatment labs with descriptions
- **Mark Clean**: Mark areas as clean after lab verification
- **Hotspot Map**: View water quality hotspots on an interactive map
- **Previous Solutions**: Access past solutions from all areas of Assam or your district

### Lab Dashboard
- **Lab Assignments**: Receive and manage reports from PHCs
- **Upload Test Results**: Submit test result PDFs and notes
- **Upload Solutions**: Provide treatment solutions and recommendations
- **Confirm Clean**: Verify area is clean after treatment
- **Previous Solutions**: Access historical solutions and test results

## Project Structure

```
LUIT_CW/
├── backend/
│   ├── main.py                 # Flask app entry point
│   ├── config.py               # Configuration management
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py            # Authentication routes
│   │   ├── water_quality.py   # Water quality status routes
│   │   ├── phc_operations.py  # PHC-specific routes
│   │   ├── lab_operations.py  # Lab-specific routes
│   │   └── reporting.py       # Reporting routes
│   ├── services/
│   │   ├── __init__.py
│   │   └── firebase_service.py # Firebase integration
│   └── models/
│       └── __init__.py
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── firebase.js
        ├── api.js
        ├── AuthContext.jsx
        ├── index.css
        └── pages/
            ├── LandingPage.jsx
            ├── ReportingPage.jsx
            ├── LoginRegisterPage.jsx
            ├── PHCDashboard.jsx
            ├── LabDashboard.jsx
            └── NotFound.jsx
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with Firebase credentials:
   ```
   FIREBASE_DATABASE_URL=your_url
   FIREBASE_STORAGE_BUCKET=your_bucket
   FIREBASE_KEY_PATH=serviceAccountKey.json
   ```

4. Place your Firebase service account key JSON file in the backend directory as `serviceAccountKey.json`

5. Run the server:
   ```bash
   python main.py
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with Firebase config:
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # ... other Firebase config values
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`

## API Routes

### Authentication
- `POST /api/auth/register` - Register PHC or Lab user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-token` - Verify JWT token

### Water Quality
- `GET /api/water-quality/reports` - Get all reports (optional district filter)
- `GET /api/water-quality/active-reports` - Get active contamination reports
- `GET /api/water-quality/area-status` - Get status for specific area
- `GET /api/water-quality/statistics` - Get overall statistics

### Reporting
- `POST /api/reporting/submit-report` - Submit new contamination report
- `GET /api/reporting/nearby-reports` - Get nearby reports
- `GET /api/reporting/reported-issues` - Get all reported issues
- `POST /api/reporting/upvote/<report_id>` - Upvote a report
- `GET /api/reporting/format-sms` - Get SMS format for reporting

### PHC Operations
- `GET /api/phc/active-reports/<district>` - Get active reports for district
- `POST /api/phc/send-to-lab` - Send report to lab
- `POST /api/phc/mark-clean/<report_id>` - Mark area as clean
- `GET /api/phc/previous-solutions` - Get previous solutions
- `GET /api/phc/hotspot-map` - Get hotspot map data

### Lab Operations
- `GET /api/lab/assignments` - Get lab assignments
- `GET /api/lab/assignment/<assignment_id>` - Get assignment details
- `POST /api/lab/upload-test-result/<assignment_id>` - Upload test result PDF
- `POST /api/lab/upload-solution/<assignment_id>` - Upload solution PDF
- `POST /api/lab/confirm-clean/<assignment_id>` - Confirm area is clean
- `GET /api/lab/previous-solutions` - Get previous solutions

## User Roles

### PHC (Public Health Center)
- Register with organization name and district
- View active contamination reports in their district
- Send reports to water treatment labs for testing
- Receive and review lab test results and solutions
- Mark areas as clean after lab verification
- View historical solutions

### Water Treatment Lab
- Register with lab name and district
- Receive reports from PHCs for testing
- Upload test result PDFs with notes
- Upload solution PDFs with detailed descriptions
- Confirm areas are clean after testing
- Access historical test results and solutions

## Database Structure (Firebase)

### Collections
- `water_quality_reports/` - All contamination reports
- `lab_assignments/` - Reports sent to labs
- `users/phc/` - PHC users
- `users/lab/` - Lab users
- `lab_solutions/` - Completed solutions and test results

## Technologies Used

### Backend
- Flask - Python web framework
- Firebase Admin SDK - Database and storage
- Python-dotenv - Environment management
- Flask-CORS - Cross-origin requests

### Frontend
- React 18 - UI framework
- React Router - Navigation
- Vite - Build tool
- Tailwind CSS - Styling
- Lucide React - Icons
- Firebase JS SDK - Client-side Firebase
- Axios - HTTP client

## Notes

- SMS functionality is currently not implemented (to be added later)
- File uploads are stored locally; consider using cloud storage in production
- Geofencing uses simple distance calculation; can be improved with actual geofencing
- Authentication uses Firebase Auth with custom tokens

## Future Enhancements

1. SMS notification module for contamination alerts
2. Advanced geofencing with proper radius-based notifications
3. Cloud storage integration for PDFs
4. Email notifications
5. Analytics dashboard with charts and graphs
6. Admin panel for system management
7. Mobile app using React Native
8. Real-time notifications using WebSockets

## License

This project is part of a hackathon initiative to improve water quality monitoring in Assam.
