# AI SRE Dashboard & MCP Server

This monorepo contains a production-grade AWS SRE assistant that operates as both an MCP server (over stdio) and a Modern Web Dashboard.

## 🏗 Architecture

- **Backend**: Node.js 20 + Express + MCP SDK (ESM).
- **Frontend**: React + Vite + Tailwind CSS (Glassmorphism UI).
- **Deployment**: Dockerized for Orchestra (Web Service).

## 🌍 Environment Variables (Detailed)

This project strictly enforces environment variables for configuration. Missing required variables will cause the server to fail startup with a clear error message.

### Backend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | The port the HTTP server listens on | No | `3000` |
| `NODE_ENV` | Startup environment (`development`, `production`, `test`) | No | `development` |
| `MODE` | Startup mode (`web` or `mcp`) | No | `web` |
| `AWS_REGION` | AWS Region for SDK calls (e.g. `us-east-1`) | Yes | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS IAM Access Key ID | **YES** | - |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Access Key | **YES** | - |

**Example `.env` (Backend):**
```env
PORT=3000
NODE_ENV=development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
```

### Frontend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Full URL to the backend API. Leave empty if serving from same origin. | No | `""` |

**Example `.env` (Frontend):**
```env
VITE_API_BASE_URL=http://localhost:3000
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- AWS Credentials configured (~/.aws/credentials or env vars)

### Local Development

1. **Install Dependencies**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure Environment**

   Copy the example files and fill in your secrets:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Run Backend (Dev Mode)**

   ```bash
   cd backend
   npm run dev
   ```

4. **Run Frontend (Dev Mode)**

   ```bash
   cd frontend
   npm run dev
   ```

   Access the dashboard at `http://localhost:5173`.

### 🐳 Docker Build

The Dockerfile is optimized for production and does **not** copy `.env` files. You must provide environment variables at runtime.

Build the production image:

```bash
docker build -t aws-sre-mcp .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  -e AWS_REGION=us-east-1 \
  aws-sre-mcp
```

## � Orchestra Deployment Checklist

1. **Service Type**: Web Service
2. **Docker Build**: Use the provided `Dockerfile`.
3. **Port**: Expose `3000`.
4. **Environment Variables**:
   - Go to your specific service settings in Orchestra.
   - Add `AWS_ACCESS_KEY_ID` (Secret)
   - Add `AWS_SECRET_ACCESS_KEY` (Secret)
   - Add `AWS_REGION` (Plaintext)
5. **Health Check**: `GET /api/health`.

## 🛡 Security Best Practices

1. **Helmet**: HTTP headers are secured using `helmet` middleware.
2. **CORS**: Cross-Origin Resource Sharing is enabled via `cors` (configure origin in production).
3. **Zod Validation**: All inputs are strictly validated using Zod schemas.
4. **Error Handling**: Centralized error middleware prevents leaking stack traces in production.
5. **Least Privilege**: Ensure the AWS IAM user/role has only necessary permissions (EC2 Read, CloudWatch Read).

## 🚨 Edge Case Handling

- **AWS Failures**: The backend catches AWS SDK errors and returns structured 500 responses.
- **Invalid Input**: Zod validation returns 400 Bad Request with detailed error messages.
- **Missing Resources**: APIs handle scenarios where instances or log groups are not found gracefully.
- **Missing Config**: The application will crash immediately on startup if required environment variables are missing, preventing undefined behavior.
