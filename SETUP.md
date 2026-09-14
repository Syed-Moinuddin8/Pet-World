# Pet World - Setup Instructions

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

This will start:
- **Backend API** on `http://localhost:3000`
- **Frontend** on `http://localhost:5173`

### 3. Open in Browser
Navigate to: `http://localhost:5173`

---

## 🔐 Login Credentials

### Owner / Super Admin
- **Username:** owner
- **Password:** `PetWorld90`
- **Access:** Full system access across all branches

### Branch Passwords

| Branch | Code | Manager | Password |
|--------|------|---------|----------|
| Petworld Clinic | B01 | Vinay Kumar | `pwc@927` |
| Riddhipetzone | B02 | Swarna Gowri | `rpz#634` |
| Petworld Hospet | B03 | Sushmitha | `pwh$815` |
| Ballari Wholesale Pet Shop | B04 | Kusuma | `bwps!472` |
| Pet Bazaar | B05 | Aishu | `pb*293` |
| Gandhinagar Pet Centre | B06 | James | `gpc@568` |

---

## ⚠️ Important Notes

### API Proxy Configuration
The Vite development server is configured to proxy all `/api/*` requests to `http://localhost:3000`. This means:
- Frontend runs on port **5173**
- Backend API runs on port **3000**
- All API calls are automatically proxied

### Common Issues

#### Problem: API calls fail with ERR_NAME_NOT_RESOLVED
**Solution:** Make sure you started the server with `npm run dev` (not just the Vite dev server)

#### Problem: Port already in use
**Solution:** 
- Stop any other process using port 3000 or 5173
- Or modify the ports in `vite.config.ts` and `server.ts`

#### Problem: Staff deletion fails
**Solution:** Make sure you're logged in as OWNER (not branch manager)

---

## 📁 Project Structure

```
pet-world/
├── src/                  # Frontend React application
│   ├── components/       # React components
│   ├── lib/             # API utilities
│   └── types.ts         # TypeScript types
├── server/              # Backend API
│   ├── app.ts           # Express routes
│   ├── db.ts            # Database operations
│   └── data.ts          # Seed data
├── data/                # Runtime database (JSON)
└── server.ts            # Main server entry point
```

---

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Type Checking
```bash
npm run lint
```

---

## 🌐 Deployment

The app is configured for Vercel deployment. Make sure to:
1. Set environment variables in Vercel dashboard
2. Configure build command: `npm run build`
3. Configure start command: `npm start`
4. Set Node.js version to 18 or higher

---

## 📝 Features

- ✅ Multi-branch POS system
- ✅ Staff management with delete functionality
- ✅ Inventory tracking across branches
- ✅ Purchase order management
- ✅ Sales history and reporting
- ✅ Attendance tracking
- ✅ Salary management
- ✅ Stock allocation between branches
- ✅ Role-based access control (Owner, Branch Manager, Cashier, Staff)

---

## 🔒 Security

- Only OWNER role can delete staff members
- Branch managers can only view their assigned branch data
- Session-based authentication
- API endpoints protected with role checks
