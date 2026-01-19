# SkillLaunch Admin Backend API Documentation

## 🔐 Authentication
All admin endpoints require authentication using JWT token.

**Login Endpoint:**
```
POST /api/admin/auth/login
Body: { "email": "admin@skilllaunch.com", "password": "admin123" }
Response: { "token": "jwt_token_here" }
```

**Use token in headers:**
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 MODULE 1: Organization Management API

**Base URL:** `/api/admin/organizations`

### Endpoints:

1. **Get All Organizations**
   - `GET /api/admin/organizations`
   - Query params: `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder`
   - Permission: `manageOrgs`

2. **Get Pending Organizations**
   - `GET /api/admin/organizations/pending`
   - Permission: `manageOrgs`

3. **Get Single Organization**
   - `GET /api/admin/organizations/:id`
   - Permission: `manageOrgs`

4. **Verify Organization**
   - `PUT /api/admin/organizations/:id/verify`
   - Permission: `manageOrgs`

5. **Reject Organization**
   - `PUT /api/admin/organizations/:id/reject`
   - Body: `{ "reason": "string", "deleteAccount": boolean }`
   - Permission: `manageOrgs`

6. **Get Organization Statistics**
   - `GET /api/admin/organizations/stats`
   - Permission: `manageOrgs`

---

## 📝 MODULE 2: Content Moderation API

**Base URL:** `/api/admin/content`

### Endpoints:

1. **Get All Posts**
   - `GET /api/admin/content/posts`
   - Query params: `page`, `limit`, `search`, `type`, `status`
   - Permission: `manageContent`

2. **Get Single Post**
   - `GET /api/admin/content/posts/:id`
   - Permission: `manageContent`

3. **Remove Post**
   - `DELETE /api/admin/content/posts/:id`
   - Body: `{ "reason": "string" }`
   - Permission: `manageContent`

4. **Get All Reports**
   - `GET /api/admin/content/reports`
   - Query params: `page`, `limit`, `status`, `type`, `priority`
   - Permission: `manageContent`

5. **Get Single Report**
   - `GET /api/admin/content/reports/:id`
   - Permission: `manageContent`

6. **Resolve Report**
   - `PUT /api/admin/content/reports/:id/resolve`
   - Body: `{ "action": "string", "note": "string" }`
   - Permission: `manageContent`

7. **Take Action on Report**
   - `POST /api/admin/content/reports/:id/action`
   - Body: `{ "action": "warning|content_removed|user_blocked|account_suspended", "note": "string" }`
   - Permission: `manageContent`

8. **Get Content Statistics**
   - `GET /api/admin/content/stats`
   - Permission: `manageContent`

---

## 📊 MODULE 3: Analytics & Dashboard API

**Base URL:** `/api/admin/analytics`

### Endpoints:

1. **Get Platform Overview**
   - `GET /api/admin/analytics/overview`
   - Permission: `viewAnalytics`

2. **Get User Growth Data**
   - `GET /api/admin/analytics/growth`
   - Query params: `days` (default: 30)
   - Permission: `viewAnalytics`

3. **Get Engagement Metrics**
   - `GET /api/admin/analytics/engagement`
   - Permission: `viewAnalytics`

4. **Get Activity Logs**
   - `GET /api/admin/analytics/activity-logs`
   - Query params: `page`, `limit`, `action`, `adminId`, `targetType`
   - Permission: `viewAnalytics`

---

## 📢 MODULE 4: Announcements System API

**Base URL:** `/api/admin/announcements`

### Endpoints:

1. **Get All Announcements**
   - `GET /api/admin/announcements`
   - Query params: `page`, `limit`, `status`, `type`, `target`
   - Permission: `sendAnnouncements`

2. **Get Single Announcement**
   - `GET /api/admin/announcements/:id`
   - Permission: `sendAnnouncements`

3. **Create Announcement**
   - `POST /api/admin/announcements`
   - Body: `{ "title": "string", "message": "string", "type": "info|warning|success", "target": "all|students|organizations", "priority": "low|medium|high", "scheduledFor": "date" }`
   - Permission: `sendAnnouncements`

4. **Update Announcement**
   - `PUT /api/admin/announcements/:id`
   - Body: Same as create
   - Permission: `sendAnnouncements`

5. **Delete Announcement**
   - `DELETE /api/admin/announcements/:id`
   - Permission: `sendAnnouncements`

6. **Send Announcement**
   - `POST /api/admin/announcements/:id/send`
   - Permission: `sendAnnouncements`

7. **Get Announcement Statistics**
   - `GET /api/admin/announcements/stats`
   - Permission: `sendAnnouncements`

---

## 🎯 MODULE 5: Skills Management API

**Base URL:** `/api/admin/skills`

### Endpoints:

1. **Get All Skills**
   - `GET /api/admin/skills`
   - Query params: `page`, `limit`, `search`, `category`, `status`
   - Permission: `manageSkills`

2. **Get Single Skill**
   - `GET /api/admin/skills/:id`
   - Permission: `manageSkills`

3. **Create Skill**
   - `POST /api/admin/skills`
   - Body: `{ "name": "string", "category": "string", "description": "string", "relatedSkills": ["id1", "id2"] }`
   - Permission: `manageSkills`

4. **Update Skill**
   - `PUT /api/admin/skills/:id`
   - Body: Same as create
   - Permission: `manageSkills`

5. **Delete Skill**
   - `DELETE /api/admin/skills/:id`
   - Permission: `manageSkills`

6. **Get Skill Categories**
   - `GET /api/admin/skills/categories`
   - Permission: `manageSkills`

7. **Bulk Add Skills**
   - `POST /api/admin/skills/bulk`
   - Body: `{ "skills": [{ "name": "string", "category": "string", "description": "string" }] }`
   - Permission: `manageSkills`

8. **Get Skill Statistics**
   - `GET /api/admin/skills/stats`
   - Permission: `manageSkills`

---

## ⚙️ MODULE 6: Platform Settings API

**Base URL:** `/api/admin/settings`

### Endpoints:

1. **Get All Settings**
   - `GET /api/admin/settings`
   - Query params: `category`, `isPublic`
   - Role: `super_admin`

2. **Get Single Setting**
   - `GET /api/admin/settings/:key`
   - Role: `super_admin`

3. **Update Multiple Settings**
   - `PUT /api/admin/settings`
   - Body: `{ "settings": { "key1": "value1", "key2": "value2" } }`
   - Role: `super_admin`

4. **Update Single Setting**
   - `PUT /api/admin/settings/:key`
   - Body: `{ "value": "any", "description": "string", "isPublic": boolean, "category": "string" }`
   - Role: `super_admin`

5. **Initialize Default Settings**
   - `POST /api/admin/settings/initialize`
   - Role: `super_admin`

6. **Get System Health**
   - `GET /api/admin/system/health`
   - Permission: Any admin

---

## 👥 MODULE 7: Admin Management API

**Base URL:** `/api/admin/admins`

### Endpoints:

1. **Get All Admins**
   - `GET /api/admin/admins`
   - Query params: `page`, `limit`, `search`, `role`, `status`
   - Role: `super_admin`

2. **Get Single Admin**
   - `GET /api/admin/admins/:id`
   - Role: `super_admin`

3. **Create Admin**
   - `POST /api/admin/admins`
   - Body: `{ "fullName": "string", "email": "string", "password": "string", "role": "admin|moderator", "permissions": {} }`
   - Role: `super_admin`

4. **Update Admin**
   - `PUT /api/admin/admins/:id`
   - Body: `{ "fullName": "string", "email": "string", "role": "string", "isActive": boolean }`
   - Role: `super_admin`

5. **Update Admin Permissions**
   - `PUT /api/admin/admins/:id/permissions`
   - Body: `{ "permissions": { "manageUsers": true, "manageOrgs": true, ... } }`
   - Role: `super_admin`

6. **Delete Admin**
   - `DELETE /api/admin/admins/:id`
   - Role: `super_admin`

7. **Get Admin Statistics**
   - `GET /api/admin/admins/stats`
   - Role: `super_admin`

---

## 📦 Models Created

### 1. Post Model
```javascript
{
  userId: ObjectId,
  title: String,
  content: String,
  type: 'internship' | 'update' | 'announcement',
  status: 'active' | 'removed' | 'flagged',
  isReported: Boolean,
  reportCount: Number,
  removedBy: ObjectId,
  removalReason: String,
  views: Number,
  likes: Number,
  comments: Number
}
```

### 2. Report Model
```javascript
{
  reporterId: ObjectId,
  reportedId: ObjectId,
  reportedType: 'user' | 'post' | 'comment',
  reason: String,
  description: String,
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed',
  actionTaken: String,
  resolvedBy: ObjectId,
  priority: 'low' | 'medium' | 'high' | 'urgent'
}
```

### 3. ActivityLog Model
```javascript
{
  adminId: ObjectId,
  action: String,
  targetType: String,
  targetId: ObjectId,
  details: String,
  ipAddress: String,
  timestamp: Date
}
```

### 4. Announcement Model
```javascript
{
  title: String,
  message: String,
  type: 'info' | 'warning' | 'success' | 'error',
  target: 'all' | 'students' | 'organizations',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  status: 'draft' | 'scheduled' | 'sent' | 'archived',
  isSent: Boolean,
  recipientsCount: Number,
  createdBy: ObjectId
}
```

### 5. Skill Model
```javascript
{
  name: String,
  category: String,
  description: String,
  popularity: Number,
  isActive: Boolean,
  relatedSkills: [ObjectId],
  createdBy: ObjectId
}
```

### 6. Setting Model
```javascript
{
  key: String,
  value: Mixed,
  type: 'string' | 'number' | 'boolean' | 'json' | 'array',
  category: String,
  description: String,
  isPublic: Boolean,
  isEditable: Boolean,
  updatedBy: ObjectId
}
```

---

## 🧪 Testing Guide

### 1. Start the Server
```bash
node server.js
```

### 2. Login as Admin
```bash
POST http://localhost:5000/api/admin/auth/login
Body: {
  "email": "admin@skilllaunch.com",
  "password": "admin123"
}
```

### 3. Copy the JWT Token
Use the token in all subsequent requests:
```
Authorization: Bearer <your_token>
```

### 4. Initialize Default Settings (First Time)
```bash
POST http://localhost:5000/api/admin/settings/initialize
```

### 5. Test Endpoints
Use Postman, Thunder Client, or curl to test each endpoint.

---

## 🔒 Permission System

### Admin Roles:
- **super_admin**: Full access to everything
- **admin**: Access to most features except admin management
- **moderator**: Limited access (content moderation, user management)

### Permissions:
- `manageUsers`: User management operations
- `manageOrgs`: Organization verification/management
- `manageContent`: Content moderation
- `manageSkills`: Skills CRUD operations
- `sendAnnouncements`: Create and send announcements
- `viewAnalytics`: View analytics and reports

---

## 📝 Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start MongoDB (if not running)
mongod

# Start server
node server.js

# Server will run on http://localhost:5000
```

---

## 📞 Support

For issues or questions, refer to the TODO.md file for implementation details.
