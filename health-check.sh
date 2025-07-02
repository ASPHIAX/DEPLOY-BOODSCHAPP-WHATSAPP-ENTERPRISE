#!/bin/sh
wget -q --spider http://localhost:3000/api/health || exit 1
