#!/bin/bash
cd "$(dirname "$0")"
PID=$(pgrep -f "python.*server\.py")
if [ -z "$PID" ]; then
    echo "실행 중인 서버가 없습니다."
else
    kill $PID && echo "서버 종료 (PID: $PID)"
fi
