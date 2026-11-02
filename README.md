# Campus Maintenance Management System (CMMS)

A web-based application designed to simplify and manage campus maintenance complaints. It allows students to report maintenance issues, staff members to handle assigned complaints, and administrators to monitor and manage the complete complaint process.

## Features

### Student
- Register and log in securely.
- Submit maintenance complaints.
- View and track complaint status.
- View complaint details and notifications.
- Add comments and feedback.
- Manage profile information.

### Staff
- Log in through staff authentication.
- View assigned complaints.
- Update complaint status.
- View complaint details and communicate through comments.
- Manage profile information.

### Administrator
- Manage student and staff accounts.
- View and manage campus complaints.
- Assign complaints to staff members.
- Monitor complaint progress.
- View analytics and feedback.
- Manage user information.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling and responsive UI |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modelling |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Vercel | Deployment |
| Git & GitHub | Version control |

## Project Structure

```text
CampusMaintainenceTracker/
│
├── config/
│   └── db.js
│
├── middleware/
│   └── auth.js
│
├── models/
│   ├── User.js
│   ├── Complaints.js
│   ├── Comment.js
│   └── Notification.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── complaintRoutes.js
│   ├── commentRoutes.js
│   ├── feedbackRoutes.js
│   ├── notificationRoutes.js
│   └── analyticsRoutes.js
│
├── scripts/
│   ├── seed.js
│   └── migrate.js
│
├── public/
│   ├── login.html
│   ├── register.html
│   ├── student-dashboard.html
│   ├── staff-dashboard.html
│   ├── admin-dashboard.html
│   ├── css/
│   └── js/
│
├── tests/
├── server.js
├── package.json
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

### 2. Navigate to the Project Folder

```bash
cd CampusMaintainenceTracker
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
```

Replace the placeholder values with your own credentials.

**Important:** Never upload your `.env` file or database credentials to GitHub.

### 5. Run the Application

```bash
npm start
```

Open the following URL in your browser:

```text
http://localhost:5000
```

### 6. Seed Demo Data (Optional)

To create the predefined demo accounts and initial data, run:

```bash
npm run seed
```

## Application Workflow

1. A student registers and logs in to the system.
2. The student submits a maintenance complaint.
3. The administrator views the complaint and assigns it to the appropriate staff member.
4. The staff member handles the complaint and updates its status.
5. The student can track the progress through the dashboard.
6. The administrator monitors complaints and system activity.

## Authentication and Security

- JWT-based user authentication.
- Role-based access control for Student, Staff and Administrator.
- Password hashing using bcryptjs.
- Protected API routes using authentication middleware.
- Environment variables for sensitive configuration.

## Deployment

The application is deployed using **Vercel**, with MongoDB Atlas as the cloud database.

Add the required environment variables (`MONGODB_URI` and `JWT_SECRET`) in your Vercel project settings before deployment.

## Future Enhancements

- Email notifications for complaint updates.
- Image attachments for maintenance complaints.
- Advanced reporting and analytics.
- Improved complaint tracking and SLA monitoring.

## Author

**Bhoomi Tiple**

B.Tech – Computer Engineering (Software)

MIT Academy of Engineering, Pune

---

*Campus Maintenance Management System – Making campus maintenance simpler, faster and more organized.*
