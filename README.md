# 🐾 PetFinder Application - CI/CD Deployment Guide

Complete guide for deploying the PetFinder application with automated CI/CD pipeline using GitHub Actions, Docker, and AWS EC2.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Initial Setup](#initial-setup)
- [GitHub Actions Configuration](#github-actions-configuration)
- [Docker Compose Setup](#docker-compose-setup)
- [Deployment Process](#deployment-process)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Application Stack

- **Backend**: Node.js REST API (Port 5000)
- **Frontend**: Angular Application (Port 4000)
- **Database**: MongoDB 6.0 (Port 27017)
- **Deployment**: Docker Compose on AWS EC2
- **CI/CD**: GitHub Actions

### Deployment Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────┐
│   GitHub    │─────▶│GitHub Actions│─────▶│ Docker Hub  │─────▶│  EC2     │
│   Push      │      │  CI/CD       │      │   Registry  │      │ Instance │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────┘
     Code              Build & Test          Store Images        Pull & Deploy
```

### Workflow Steps

1. **Code Push** → Triggers GitHub Actions
2. **Testing** → Runs Jest (Backend) & Angular tests (Frontend)
3. **Build** → Creates Docker images for both services
4. **Push** → Uploads images to Docker Hub
5. **Deploy** → SSH to EC2, pull images, restart containers

---

## ✅ Prerequisites

### Required Tools & Accounts

- [x] GitHub account with repository access
- [x] Docker Hub account
- [x] AWS account with EC2 instance running Ubuntu
- [x] Node.js 20.x installed locally (for development)
- [x] Git installed
- [x] SSH key pair for EC2 access

### EC2 Instance Requirements

- **OS**: Ubuntu 20.04 LTS or later
- **Instance Type**: t2.medium or larger (minimum 2GB RAM)
- **Security Groups**: 
  - SSH (22) - Your IP
  - HTTP (80) - 0.0.0.0/0
  - Custom TCP (4000) - 0.0.0.0/0 (Frontend)
  - Custom TCP (5000) - 0.0.0.0/0 (Backend)
- **Storage**: At least 20GB

### Software on EC2

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker ubuntu

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version
```

---

## 📁 Project Structure

```
Find_Pet/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions pipeline
├── code/
│   ├── petmanagement_backend_rajalakshmi/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── .env                   # Backend environment variables
│   │   └── jest.config.js
│   ├── petmanagement_frontend_rajalakshmi/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── angular.json
│   └── docker-compose.yml         # Main orchestration file
└── README.md
```

---

## 🚀 Initial Setup

### Step 1: Clone Repository on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone repository
cd /home/ubuntu
git clone https://github.com/your-username/Find_Pet.git
cd Find_Pet/code
```

### Step 2: Configure Backend Environment

Create `.env` file in `petmanagement_backend_rajalakshmi/`:

```bash
nano petmanagement_backend_rajalakshmi/.env
```

Add your environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Configuration
MONGO_URI=mongodb://mongodb:27017/petmanagement

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

# API Configuration
API_VERSION=v1

# CORS Configuration
CORS_ORIGIN=http://your-ec2-ip:4000

# Other secrets as needed
```

### Step 3: Update Docker Compose Configuration

Edit `docker-compose.yml` and update:

```yaml
# Update frontend environment with your EC2 IP
environment:
  - API_URL=http://YOUR_EC2_IP:5000/v1
```

### Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | Docker Hub username | `sudalai29` |
| `DOCKER_PASSWORD` | Docker Hub password or token | `dckr_pat_xxxxx` |
| `EC2_HOST` | EC2 instance public IP | `13.203.226.60` |
| `EC2_SSH_KEY` | Private SSH key for EC2 | Contents of `.pem` file |

#### How to Add EC2 SSH Key Secret:

```bash
# On your local machine, copy the entire content of your .pem file
cat your-key.pem

# Paste the entire content (including BEGIN and END lines) into the secret
```

---

## ⚙️ GitHub Actions Configuration

### Workflow File Location

`.github/workflows/ci-cd.yml`

### Pipeline Stages

#### 1. **Testing Phase**
- Checks out code
- Sets up Node.js 20
- Installs dependencies
- Runs Jest tests (Backend)
- Validates Angular build (Frontend)

#### 2. **Build Phase**
- Builds Docker images for backend and frontend
- Tags images with:
  - `latest` tag
  - Git commit SHA tag (e.g., `abc123def`)

#### 3. **Push Phase**
- Authenticates with Docker Hub
- Pushes both images to registry

#### 4. **Deploy Phase**
- SSH into EC2 instance
- Backs up current docker-compose.yml
- Pulls latest images from Docker Hub
- Recreates containers with new images
- Cleans up old unused images

### Trigger Conditions

The pipeline triggers on:

```yaml
on:
  push:
    branches:
      - main
  pull_request:      # Runs on all PRs
  workflow_dispatch:  # Manual trigger
```

**To Enable Auto-Deploy**: Change `temp-disable` to `main` or your target branch.

### Manual Trigger

1. Go to GitHub repository
2. Click **Actions** tab
3. Select workflow "Test, Build & Push (Node.js + Angular)"
4. Click **Run workflow** button

---

## 🐳 Docker Compose Setup

### Services Overview

#### Backend Service
```yaml
services:
  backend:
    image: sudalai29/findpet-backend:latest
    container_name: my-node-backend
    ports:
      - "5000:5000"
    networks:
      - app-network
    depends_on:
      - mongodb
```

#### Frontend Service
```yaml
  frontend:
    image: sudalai29/findpet-frontend:latest
    container_name: my-angular-frontend
    ports:
      - "4000:4000"
    networks:
      - app-network
    depends_on:
      - backend
```

#### MongoDB Service
```yaml
  mongodb:
    image: mongo:6.0
    container_name: mongodb
    ports:
      - "127.0.0.1:27017:27017"  # Only localhost access
    volumes:
      - mongo_data:/data/db
```

### Network Configuration

All services communicate through `app-network` bridge network.

### Volume Management

MongoDB data persists in `mongo_data` volume, surviving container restarts.

---

## 🚢 Deployment Process

### Automated Deployment (via GitHub Actions)

1. **Make Changes**:
   ```bash
   git checkout -b feature/new-feature
   # Make your changes
   git add .
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

2. **Create Pull Request**: Open PR on GitHub

3. **Review & Merge**: After tests pass, merge to main branch

4. **Auto-Deploy**: Pipeline automatically deploys to EC2

### Manual Deployment

If you need to deploy manually on EC2:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /home/ubuntu/Find_Pet/code

# Pull latest images
docker compose pull

# Restart services
docker compose up -d --remove-orphans

# View logs
docker compose logs -f
```

### First-Time Deployment

```bash
# On EC2, navigate to project directory
cd /home/ubuntu/Find_Pet/code

# Create backend .env file (if not exists)
nano petmanagement_backend_rajalakshmi/.env
# Add your environment variables and save

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

---

## 📊 Monitoring & Maintenance

### Check Container Status

```bash
# View running containers
docker compose ps

# View all containers (including stopped)
docker ps -a

# Check container health
docker inspect my-node-backend | grep Status
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Last 100 lines
docker compose logs --tail=100 backend
```

### Monitor Resource Usage

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Detailed container info
docker compose top
```

### Database Access

```bash
# Access MongoDB shell
docker exec -it mongodb mongosh

# Inside MongoDB shell:
use petmanagement
show collections
db.pets.find().limit(5)
exit
```

### Backup MongoDB Data

```bash
# Create backup
docker exec mongodb mongodump --out=/tmp/backup

# Copy backup from container
docker cp mongodb:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore from backup
docker exec -i mongodb mongorestore /tmp/backup
```

---

## 🔧 Configuration Management

### Update Environment Variables

```bash
# Edit backend .env
cd /home/ubuntu/Find_Pet/code
nano petmanagement_backend_rajalakshmi/.env

# Restart backend only
docker compose restart backend
```

### Update Docker Compose Settings

```bash
# Edit compose file
nano docker-compose.yml

# Apply changes
docker compose up -d
```

### Update Application Code

Changes are automatically deployed via GitHub Actions. For manual updates:

```bash
# Pull latest code
cd /home/ubuntu/Find_Pet
git pull origin main

# Rebuild images (if needed)
cd code
docker compose build

# Restart services
docker compose up -d
```

---

## 🐛 Troubleshooting

### Pipeline Failures

#### Build Fails
```bash
# Check GitHub Actions logs for specific error
# Common issues:
# - Missing dependencies in package.json
# - Test failures
# - Syntax errors
```

**Solution**: Fix code issues, commit, and push again.

#### Docker Push Fails
```bash
# Error: denied: requested access to the resource is denied
```

**Solution**: Verify Docker Hub credentials in GitHub Secrets.

#### SSH Connection Fails
```bash
# Error: connection timeout or permission denied
```

**Solution**: 
- Check EC2 security group allows SSH from GitHub Actions IPs
- Verify `EC2_SSH_KEY` secret contains complete private key
- Ensure EC2 instance is running

### Container Issues

#### Backend Won't Start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - MongoDB connection failed
# - Missing environment variables
# - Port already in use
```

**Solutions**:
```bash
# Restart MongoDB first
docker compose restart mongodb
docker compose restart backend

# Check environment variables
docker compose exec backend env | grep MONGO

# Check port availability
sudo lsof -i :5000
```

#### Frontend Won't Start

```bash
# Check logs
docker compose logs frontend

# Common issues:
# - API_URL misconfigured
# - Build errors
# - Port conflicts
```

**Solutions**:
```bash
# Verify API_URL
docker compose exec frontend env | grep API_URL

# Rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

#### MongoDB Connection Issues

```bash
# Check MongoDB is running
docker compose ps mongodb

# Test connection from backend
docker compose exec backend ping -c 3 mongodb

# Check MongoDB logs
docker compose logs mongodb
```

**Solutions**:
```bash
# Restart MongoDB
docker compose restart mongodb

# Check data volume
docker volume inspect code_mongo_data

# Reset MongoDB (WARNING: deletes data)
docker compose down
docker volume rm code_mongo_data
docker compose up -d
```

### Performance Issues

#### High Memory Usage

```bash
# Check memory usage
docker stats --no-stream

# Check EC2 instance resources
free -h
df -h
```

**Solutions**:
```bash
# Restart containers
docker compose restart

# Clean up unused resources
docker system prune -a -f

# Consider upgrading EC2 instance type
```

#### Slow Response Times

```bash
# Check network latency
docker compose exec backend ping -c 5 mongodb

# Check logs for errors
docker compose logs --tail=100 backend
```

**Solutions**:
- Optimize database queries
- Add indexes to MongoDB collections
- Check for memory leaks in application code
- Review EC2 instance performance metrics

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Service not running | Check container status, restart service |
| `EADDRINUSE` | Port already in use | Stop conflicting process or change port |
| `MongoNetworkError` | Can't connect to MongoDB | Verify MongoDB is running, check network |
| `Authentication failed` | Wrong credentials | Update .env file with correct values |
| `Cannot find module` | Missing dependency | Run `npm install` and rebuild image |

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use strong JWT secrets
- ✅ Rotate credentials regularly
- ✅ Use GitHub Secrets for sensitive data

### MongoDB Security
- ✅ MongoDB only accessible from localhost (127.0.0.1)
- ✅ Consider enabling MongoDB authentication for production
- ✅ Regular backups of database

### EC2 Security
- ✅ Use security groups to restrict access
- ✅ Keep software updated: `sudo apt update && sudo apt upgrade`
- ✅ Use SSH keys, disable password authentication
- ✅ Consider using AWS Secrets Manager for sensitive data

### Docker Security
- ✅ Use specific image tags, avoid `:latest` in production
- ✅ Regularly update base images
- ✅ Scan images for vulnerabilities
- ✅ Run containers as non-root users when possible

---

## 📈 Scaling & Optimization

### Horizontal Scaling

```yaml
# In docker-compose.yml, use replicas
services:
  backend:
    deploy:
      replicas: 3
```

### Add Load Balancer

Consider adding NGINX as reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend
```

### Performance Monitoring

Install monitoring tools:

```bash
# Docker stats in real-time
watch docker stats

# Install monitoring stack (Prometheus + Grafana)
# See separate monitoring guide
```

---

## 🔄 Rollback Procedure

### Rollback to Previous Image

```bash
# On EC2, edit docker-compose.yml
nano docker-compose.yml

# Change image tag to previous SHA
# Example: sudalai29/findpet-backend:abc123def

# Pull and restart
docker compose pull
docker compose up -d
```

### Restore from Backup

```bash
# If you have docker-compose.yml backups
cp docker-compose.yml.bak.20250115-120000 docker-compose.yml
docker compose up -d
```

---

## 📞 Support & Resources

### Useful Commands Cheat Sheet

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart specific service
docker compose restart backend

# View logs
docker compose logs -f

# Update images and restart
docker compose pull && docker compose up -d

# Clean up
docker system prune -a -f

# Check container health
docker compose ps
```

### Documentation Links

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Angular Documentation](https://angular.io/docs)

### Emergency Contacts

- **DevOps Team**: devops@yourcompany.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **AWS Support**: Your AWS support plan

---


## 🎉 Quick Start Summary


```bash
# 1. Setup EC2 with Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin

# 2. Clone repo
git clone https://github.com/your-username/Find_Pet.git
cd Find_Pet/code

# 3. Configure environment
nano petmanagement_backend_rajalakshmi/.env

# 4. Deploy
docker compose up -d

# 5. Check status
docker compose ps
docker compose logs -f
```

---

**Version:** 1.0  
**Last Updated:** October 2025  
