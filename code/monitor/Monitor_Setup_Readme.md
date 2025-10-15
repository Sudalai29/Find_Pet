# 🐾 PetFinder Container Monitoring Setup Guide

This guide will help you set up automated monitoring for your PetFinder application containers (Node.js backend and Angular frontend).

## 📋 Prerequisites

- Docker installed and running
- Root or sudo access
- Ubuntu/Debian Linux system
- Containers named: `my-node-backend` and `my-angular-frontend`

---

## 🚀 Installation Steps

### Step 1: Download the Monitoring Script

Save the monitoring script to `/usr/local/bin/`:

```bash
sudo nano /usr/local/bin/petfinder_monitor.sh
```

Paste the monitoring script content and save (Ctrl+X, then Y, then Enter).

### Step 2: Make Script Executable

```bash
sudo chmod +x /usr/local/bin/petfinder_monitor.sh
```

### Step 3: Test the Script Manually (Optional but Recommended)

Before setting up as a service, test the script manually:

```bash
sudo /usr/local/bin/petfinder_monitor.sh
```

Press `Ctrl+C` to stop the test run.

### Step 4: Create Systemd Service File

Create the service configuration:

```bash
sudo nano /etc/systemd/system/petfinder-monitor.service
```

Paste the following configuration:

```ini
[Unit]
Description=PetFinder Error Log Monitor
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/local/bin/petfinder_monitor.sh
Restart=always
User=root
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 5: Enable and Start the Service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable petfinder-monitor

# Start the service now
sudo systemctl start petfinder-monitor
```

---

## 🔍 Monitoring & Verification

### Check Service Status

```bash
sudo systemctl status petfinder-monitor
```

Expected output:
```
● petfinder-monitor.service - PetFinder Error Log Monitor
     Loaded: loaded (/etc/systemd/system/petfinder-monitor.service; enabled)
     Active: active (running) since...
```

### View Real-Time Logs

**From log file:**
```bash
sudo tail -f /var/log/petfinder.log
```

**From systemd journal:**
```bash
sudo journalctl -u petfinder-monitor -f
```

### View Historical Logs

```bash
# Last 100 lines
sudo tail -n 100 /var/log/petfinder.log

# Logs from last 30 minutes
sudo journalctl -u petfinder-monitor --since "30 minutes ago"

# Logs from specific time
sudo journalctl -u petfinder-monitor --since "2025-10-15 07:00:00"
```

---

## ⚙️ Service Management Commands

```bash
# Start service
sudo systemctl start petfinder-monitor

# Stop service
sudo systemctl stop petfinder-monitor

# Restart service
sudo systemctl restart petfinder-monitor

# Check status
sudo systemctl status petfinder-monitor

# Disable auto-start on boot
sudo systemctl disable petfinder-monitor

# Enable auto-start on boot
sudo systemctl enable petfinder-monitor
```

---

## 🎯 What the Monitor Does

### Monitoring Features

- ✅ Monitors Docker containers: `my-node-backend` and `my-angular-frontend`
- ✅ Checks for errors every 60 seconds
- ✅ Detects common error patterns:
  - `Error:`
  - `Exception`
  - `UnhandledRejection`
  - `TypeError`
  - `ReferenceError`
  - `ECONNREFUSED`
  - `EADDRINUSE`
  - `500` (HTTP errors)
  - `failed`
  - `crash`

### Alert Thresholds

- 🚨 Triggers alert when **5 or more errors** are detected in a 60-second window
- 📝 Logs all activity to `/var/log/petfinder.log`
- 🔄 Automatically rotates logs when file exceeds 5MB

### Log Locations

- **Main log file**: `/var/log/petfinder.log`
- **Rotated logs**: `/var/log/petfinder.log.1` through `.6`
- **Systemd journal**: Accessible via `journalctl`

---

## 🔧 Configuration Customization

To modify monitoring settings, edit the script:

```bash
sudo nano /usr/local/bin/petfinder_monitor.sh
```

### Key Configuration Variables

```bash
# Change monitoring interval (default: 60 seconds)
INTERVAL=60

# Change error threshold (default: 5 errors)
MAX_ERRORS=5

# Change log file location
LOG_FILE="/var/log/petfinder.log"

# Add/remove containers to monitor
CONTAINERS=("my-node-backend" "my-angular-frontend")

# Add custom error patterns
ERROR_PATTERNS=(
  "Error:"
  "Exception"
  # Add your patterns here
)
```

After making changes:

```bash
sudo systemctl restart petfinder-monitor
```

---

## 🐛 Troubleshooting

### Service Won't Start

**Check for syntax errors:**
```bash
sudo bash -n /usr/local/bin/petfinder_monitor.sh
```

**View detailed error logs:**
```bash
sudo journalctl -u petfinder-monitor -n 50 --no-pager
```

### No Logs Appearing

**Verify containers are running:**
```bash
docker ps | grep -E "my-node-backend|my-angular-frontend"
```

**Check if logs are being generated:**
```bash
docker logs --since "60s" my-node-backend
docker logs --since "60s" my-angular-frontend
```

**Verify log file permissions:**
```bash
ls -la /var/log/petfinder.log
```

### Service Keeps Restarting

**Check for Docker connectivity:**
```bash
sudo systemctl status docker
docker ps
```

**View crash logs:**
```bash
sudo journalctl -u petfinder-monitor -b
```

### False Positive Alerts

If you're getting too many alerts, adjust the threshold:

```bash
sudo nano /usr/local/bin/petfinder_monitor.sh
# Change: MAX_ERRORS=5
# To: MAX_ERRORS=10 (or higher)

sudo systemctl restart petfinder-monitor
```

---

## 📊 Log Format Examples

### Normal Operation
```
[2025-10-15 07:29:56] ✅ Containers are up, monitoring started.
[2025-10-15 07:30:57] ✅ Monitor cycle complete
```

### With Container Logs
```
════════════════════════════════════════════════════════════
🔍 Monitoring cycle started at 2025-10-15 07:31:57
════════════════════════════════════════════════════════════
📦 Fetching logs from container: my-node-backend

📋 Container Logs:
────────────────────────────────────────────────────────────
[my-node-backend] 2025-10-15T07:31:45Z Server listening on port 3000
[my-angular-frontend] 2025-10-15T07:31:50Z Angular app started
────────────────────────────────────────────────────────────

✅ No critical errors detected (found 0 error pattern matches, threshold is 5)
```

### Error Alert
```
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
[2025-10-15 07:32:15] 🚨 ALERT: 7 errors detected across containers in last 60s
[2025-10-15 07:32:15] Error Details:

[my-node-backend] 2025-10-15T07:32:10Z Error: ECONNREFUSED
[my-node-backend] 2025-10-15T07:32:11Z TypeError: Cannot read property 'id'
------------------------------------------------------------
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
```

---

## 🔐 Security Notes

- The service runs as **root** to access Docker daemon
- Log files are stored in `/var/log/` with restricted permissions
- Consider limiting log file access if sensitive data is logged

---

## 📞 Support & Maintenance

### Regular Maintenance

```bash
# Check disk usage of logs
du -sh /var/log/petfinder.log*

# Manually rotate logs if needed
sudo systemctl stop petfinder-monitor
sudo mv /var/log/petfinder.log /var/log/petfinder.log.backup
sudo systemctl start petfinder-monitor

# Clean old rotated logs
sudo rm -f /var/log/petfinder.log.[4-6]
```

### Uninstall

To completely remove the monitoring service:

```bash
# Stop and disable service
sudo systemctl stop petfinder-monitor
sudo systemctl disable petfinder-monitor

# Remove service file
sudo rm /etc/systemd/system/petfinder-monitor.service

# Remove script
sudo rm /usr/local/bin/petfinder_monitor.sh

# Remove logs (optional)
sudo rm -f /var/log/petfinder.log*

# Reload systemd
sudo systemctl daemon-reload
```

---

## ✅ Quick Reference Card

| Task | Command |
|------|---------|
| View real-time logs | `sudo tail -f /var/log/petfinder.log` |
| Check service status | `sudo systemctl status petfinder-monitor` |
| Restart service | `sudo systemctl restart petfinder-monitor` |
| View all logs | `sudo journalctl -u petfinder-monitor -f` |
| Stop monitoring | `sudo systemctl stop petfinder-monitor` |
| Start monitoring | `sudo systemctl start petfinder-monitor` |

---

**Version:** 1.0  
**Last Updated:** October 2025  
