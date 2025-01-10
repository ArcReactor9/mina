# Deployment Guide for Live2D Virtual Streamer

This guide will help you deploy the Live2D Virtual Streamer service on a Linux server.

## Prerequisites

1. A Linux server with:
   - Python 3.9+ installed
   - pip (Python package manager)
   - Git (for cloning the repository)
   - Screen or tmux (for running the service in background)

## Deployment Steps

### 1. Clone the Repository

```bash
# Create a directory for the application
mkdir -p /opt/live2d-streamer
cd /opt/live2d-streamer

# Clone the repository (replace with your actual repository URL)
git clone <your-repository-url> .
```

### 2. Set Up Python Environment

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Create .env file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Port number for the service (default: 8000)

### 4. Set Up Service Directory

```bash
# Create necessary directories
mkdir -p static/audio
mkdir -p static/backgrounds

# Set proper permissions
chmod -R 755 static
```

### 5. Run the Service

#### Option 1: Using Screen (Recommended for development)

```bash
# Start a new screen session
screen -S live2d

# Activate virtual environment and start the service
source venv/bin/activate
python main.py

# Detach from screen session: Press Ctrl+A, then D
# To reattach to screen session: screen -r live2d
```

#### Option 2: Using Systemd Service (Recommended for production)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/live2d-streamer.service
```

Add the following content:

```ini
[Unit]
Description=Live2D Virtual Streamer Service
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/opt/live2d-streamer
Environment="PATH=/opt/live2d-streamer/venv/bin"
ExecStart=/opt/live2d-streamer/venv/bin/python main.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable live2d-streamer

# Start the service
sudo systemctl start live2d-streamer

# Check service status
sudo systemctl status live2d-streamer
```

### 6. Configure Nginx (Optional, recommended for production)

If you want to use Nginx as a reverse proxy:

```bash
sudo nano /etc/nginx/sites-available/live2d-streamer
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /opt/live2d-streamer/static/;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/live2d-streamer /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Maintenance

### Updating the Service

```bash
# Navigate to the service directory
cd /opt/live2d-streamer

# Pull latest changes
git pull

# Activate virtual environment
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Restart the service
sudo systemctl restart live2d-streamer
```

### Viewing Logs

```bash
# View service logs
sudo journalctl -u live2d-streamer -f

# View nginx logs (if using nginx)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

1. If the service fails to start:
   - Check logs: `sudo journalctl -u live2d-streamer -n 100`
   - Verify environment variables in `.env`
   - Check permissions on directories

2. If WebSocket connection fails:
   - Verify nginx configuration (if using nginx)
   - Check firewall settings
   - Ensure port is open and accessible

3. If static files are not loading:
   - Check directory permissions
   - Verify nginx static file configuration
   - Clear browser cache

## Security Considerations

1. Always use HTTPS in production
2. Keep API keys secure
3. Regularly update dependencies
4. Use appropriate file permissions
5. Consider implementing rate limiting
6. Monitor server resources and logs
