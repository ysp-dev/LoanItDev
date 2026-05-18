#!/bin/bash
cd "$(dirname "$0")"
nohup venv/bin/python3.14 server.py > server.log 2>&1 &
echo "서버 시작 (PID: $!)"
