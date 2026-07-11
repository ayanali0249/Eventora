# Eventora

**Eventora** is an AI-powered event planning and vendor marketplace platform that connects users with verified vendors for weddings and events. It combines real-time chat, secure authentication, bookings, reviews, AI-driven recommendations, a responsive UI, and an admin dashboard — built on the MERN stack with PostgreSQL.

---

## ✨ Features

- **AI Recommendations** — Smart vendor suggestions tailored to user preferences, budget, and event type.
- **Vendor Marketplace** — Browse, filter, and connect with verified vendors for weddings and events.
- **Real-Time Chat** — Instant messaging between users and vendors.
- **Secure Authentication** — Protected login/signup with token-based auth.
- **Bookings** — Book vendors and manage event reservations end to end.
- **Reviews & Ratings** — Leave and read feedback to make informed decisions.
- **Responsive UI** — Optimized experience across desktop, tablet, and mobile.
- **Admin Dashboard** — Manage users, vendors, bookings, and platform activity.

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React.js                            |
| Backend    | Node.js, Express.js                 |
| Database   | MongoDB (MERN) + PostgreSQL         |
| Auth       | JWT-based authentication            |
| Real-Time  | WebSockets / Socket.IO              |

---

## 📁 Project Structure

```
Eventora/
├── client/        # Frontend (React)
├── server/        # Backend (Node.js / Express + APIs)
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB instance
- PostgreSQL instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ayanali0249/Eventora.git
   cd Eventora
   ```

2. **Set up the server**
   ```bash
   cd server
   npm install
   ```

3. **Set up the client**
   ```bash
   cd ../client
   npm install
   ```

### Environment Variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
POSTGRES_URI=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

> Adjust variables to match your configuration.

### Running the App

**Start the backend:**
```bash
cd server
npm start
```

**Start the frontend:**
```bash
cd client
npm start
```

The client runs on `http://localhost:3000` and the server on `http://localhost:5000` by default.

---

## 🤝 Contributing

Contributions are welcome! Fork the repo, create a feature branch, and open a pull request.

1. Fork the project
2. Create your branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Ayan Ali**
- GitHub: [@ayanali0249](https://github.com/ayanali0249)
