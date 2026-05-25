# Stock Wisely - Advanced Inventory Management System

Stock Wisely is a comprehensive, AI-powered inventory management solution designed for modern businesses. It combines traditional stock tracking with advanced machine learning for demand forecasting and an AI-driven assistant for natural language business intelligence.

## 🚀 Features

- **Advanced Inventory Control**: FIFO-based stock valuation, movement tracking, and batch management.
- **AI Business Assistant**: Ask questions about your sales, stock, and profit in plain English using the integrated Llama-3 LLM.
- **Demand Forecasting**: Predictive analytics using LSTM and Hybrid models trained on 5 years of historical data to forecast future stock needs.
- **Master-Detail Transaction Management**: Robust tracking of Sales and Purchases with real-time stock updates.
- **Automated Notifications**: Email and in-app alerts for low stock, product expiry, and payment deadlines.
- **Financial Reporting**: Detailed analytics for VAT, profit/loss, vendor ledgers, and sales trends.

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Axios, Chart.js
- **Backend**: Node.js, Express.js, Prisma ORM, PostgreSQL
- **AI/ML**: Python, TensorFlow (LSTM), Scikit-learn, Groq API (Llama-3)
- **Infrastructure**: JWT Auth, Google OAuth 2.0, Nodemailer, Winston Logging

## 📂 Project Structure

- `/backend`: Node.js Express server and API logic.
- `/sw-stock-wisely`: React.js frontend application.
- `/ml-training`: Python scripts for data processing and ML model training.
- `/tools`: Utility scripts for data migration and database management.

## ⚙️ Setup Instructions

### Backend
1. Navigate to `/backend`.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run `npx prisma generate` and `npm start`.

### Frontend
1. Navigate to `/sw-stock-wisely`.
2. Run `npm install`.
3. Run `npm start`.

### ML Training
1. Navigate to `/ml-training`.
2. Create a virtual environment: `python -m venv venv`.
3. Install requirements: `pip install -r requirements.txt`.
4. Run the pipeline: `python run_full_pipeline.py`.

## 🔒 Security
- All database queries are parameterized to prevent SQL injection.
- Secure authentication via JWT and bcrypt.
- Environment variables used for all sensitive credentials.

## 📄 License
MIT License - See the project documentation for more details.
