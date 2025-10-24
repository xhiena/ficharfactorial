# Project Structure

This document describes the clean, production-ready structure of the Factorial Time Tracker project.

## 📁 Core Files

```
factorial-time-tracker/
├── src/                          # TypeScript source code
│   ├── index.ts                  # CLI entry point
│   ├── config.ts                 # Configuration management
│   ├── logger.ts                 # Logging setup
│   ├── factorial-automation.ts   # Login and navigation
│   └── time-tracker.ts           # Core time tracking logic
│
├── docker/                       # Docker configuration
│   └── entrypoint.sh            # Container startup script
│
├── logs/                         # Application logs (gitignored)
│   └── .gitkeep                 # Keep directory in git
│
├── package.json                  # Node.js dependencies
├── package-lock.json            # Locked dependency versions
├── tsconfig.json                # TypeScript configuration
├── playwright.config.ts         # Playwright browser config
│
├── .env.example                  # Environment template
├── .gitignore                   # Git ignore rules
├── .gitattributes              # Git attributes
├── .dockerignore               # Docker ignore rules
│
└── README.md                    # Main documentation
```

## 🐳 Docker Deployment Files

```
├── Dockerfile.prod              # Production multi-stage build
├── Dockerfile.simple           # Single-stage build (Synology)
├── docker-compose.prod.yml     # Production deployment
├── docker-compose.synology.yml # Synology NAS deployment
├── docker-stack.yml            # Docker Swarm deployment
├── k8s-deployment.yml          # Kubernetes deployment
```

## 🛠️ Management Scripts

```
├── deploy.ps1                  # Windows deployment script
├── manage.ps1                  # Windows management script
```

## 📚 Documentation

```
├── README.md                   # Main project documentation
├── DOCKER_DEPLOYMENT.md       # Docker deployment guide
├── SYNOLOGY_DEPLOYMENT.md     # Synology-specific guide
└── PROJECT_STRUCTURE.md       # This file
```

## 🚫 Excluded Files

These files are excluded from Docker builds via `.dockerignore`:

- `node_modules/` - Will be installed in container
- `dist/` - Will be built in container
- `logs/` - Will be mounted as volume
- `.env*` - Will be mounted or passed as environment variables
- `*.md` - Documentation not needed in container
- Management scripts - Not needed in container

## 🧹 Cleaned Up

The following files were removed during cleanup:

- ❌ `deploy.sh` - Linux script (Windows PowerShell version kept)
- ❌ `test-docker.sh` - Linux test script
- ❌ `test-docker.ps1` - No longer needed
- ❌ `DOCKER-SETUP.md` - Duplicate documentation
- ❌ `docker/README.md` - Unnecessary
- ❌ `Dockerfile` - Basic version (optimized versions kept)
- ❌ `.env.production` - Same as `.env.example`
- ❌ Generated log files - Will be recreated
- ❌ `dist/` directory - Will be rebuilt

## 📦 Ready for Production

The project is now clean and ready for:

1. **Development**: `npm run dev`
2. **Production Build**: `npm run build`
3. **Docker Deployment**: 
   - Standard: `docker-compose -f docker-compose.prod.yml up -d`
   - Synology: `docker-compose -f docker-compose.synology.yml up -d`
4. **Management**: `.\manage.ps1 [command]`

## 🔄 Deployment Process

1. Clone repository
2. Copy `.env.example` to `.env` and configure
3. Choose deployment method:
   - Docker Compose (recommended)
   - Docker Swarm
   - Kubernetes
4. Deploy using provided scripts or compose files

The project structure is now optimized for production deployment with minimal unnecessary files.