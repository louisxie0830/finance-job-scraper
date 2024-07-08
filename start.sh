#!/bin/bash

# 启动 dbus 服务
echo "Starting dbus service..."
dbus-uuidgen > /etc/machine-id
service dbus start

# 启动 Xvfb
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x24 &

# 设置 DISPLAY 环境变量
export DISPLAY=:99

# 启动应用程序
echo "Starting application..."
npm run run-prod