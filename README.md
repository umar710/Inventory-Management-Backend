# Inventory Management Backend API

A complete RESTful backend API for an Inventory Management System built with Node.js, Express, and SQLite. This API provides full CRUD operations for products, inventory tracking, user authentication, and CSV import/export functionality.

## 🚀 Live Demo

**Backend API URL:** https://inventory-management-backend-d94i.onrender.com

## 📋 Features

- **🔐 JWT Authentication** - Secure user registration and login
- **📦 Product Management** - Full CRUD operations for products
- **📊 Inventory Tracking** - Automatic stock change history
- **📁 CSV Import/Export** - Bulk product operations
- **🔍 Search & Filter** - Advanced product filtering
- **📄 Pagination** - Efficient data handling
- **🛡️ Input Validation** - Comprehensive data validation
- **🧪 Automated Testing** - Complete test suite

## 🛠️ Tech Stack

- **Backend Framework:** Node.js + Express.js
- **Database:** SQLite with sqlite3
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Validation:** Express Validator
- **Testing:** Jest + Supertest
- **Deployment:** Render

## 📚 API Documentation

### Base URL
```
https://inventory-management-backend-d94i.onrender.com/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `POST` | `/auth/register` | Register new user | Public |
| `POST` | `/auth/login` | User login | Public |

### Product Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/products` | Get all products (with search/filter) | Required |
| `GET` | `/products/:id` | Get product by ID | Required |
| `POST` | `/products` | Create new product | Required |
| `PUT` | `/products/:id` | Update product | Required |
| `DELETE` | `/products/:id` | Delete product | Required |
| `GET` | `/products/:id/history` | Get inventory history | Required |
| `GET` | `/products/data/categories` | Get all categories | Required |

### Import/Export Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `POST` | `/products/import` | Import products from CSV | Required |
| `GET` | `/export-products` | Export products to CSV | Required |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

## 🔑 Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📖 API Usage Examples

### 1. User Registration

```bash
curl -X POST https://inventory-management-backend-d94i.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### 2. User Login

```bash
curl -X POST https://inventory-management-backend-d94i.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepassword123"
  }'
```

### 3. Get All Products (with pagination)

```bash
curl -X GET "https://inventory-management-backend-d94i.onrender.com/api/products?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Create New Product

```bash
curl -X POST https://inventory-management-backend-d94i.onrender.com/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Wireless Mouse",
    "unit": "Piece",
    "category": "Electronics",
    "brand": "Logitech",
    "stock": 25
  }'
```

### 5. Export Products to CSV

```bash
curl -X GET https://inventory-management-backend-d94i.onrender.com/api/export-products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output products.csv
```

## 🗂️ Database Schema

### Products Table
```sql
id (Primary Key)
name (Unique, Not Null)
unit
category
brand
stock (Not Null)
status (In Stock/Out of Stock)
image
created_at
updated_at
```

### Inventory History Table
```sql
id (Primary Key)
product_id (Foreign Key)
old_quantity
new_quantity
change_date
user_info
```

### Users Table
```sql
id (Primary Key)
username (Unique, Not Null)
email (Unique, Not Null)
password (Not Null)
created_at
```

## 🧪 Testing

The API includes a comprehensive test suite:

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

**Test Results:**
- ✅ 9 passing tests
- ✅ 22.25% code coverage
- ✅ Authentication tests
- ✅ API endpoint tests
- ✅ Error handling tests

## 🚀 Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `FRONTEND_URL` | Frontend domain for CORS | Optional |

### Build & Deploy

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start server
npm start
```

## 📊 API Response Format

### Success Response
```json
{
  "status": "success",
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error description",
  "message": "Detailed error message"
}
```

### Paginated Response
```json
{
  "products": [],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🔒 Security Features

- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Secure password hashing (bcrypt)
- Rate limiting ready

## 📈 Performance Features

- Pagination for large datasets
- Efficient database queries
- Response compression
- CORS pre-flight optimization

## 🐛 Error Handling

The API provides meaningful error messages for:
- Validation errors
- Authentication failures
- Database errors
- File upload errors
- Resource not found

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions:
- Create an issue in the repository
- Check the API documentation
- Test endpoints using the provided examples

---
