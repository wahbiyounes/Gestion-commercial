#!/usr/bin/env bash
# MonERP - Lanceur pour Linux / macOS
set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "  MonERP - Gestion d'entreprise"
echo "  Backend : port 3001"
echo "  Frontend : port 5173"
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERREUR] Node.js n'est pas installe."
  echo "Telechargez-le sur https://nodejs.org puis relancez ce script."
  exit 1
fi

echo "[1/4] Verification des dependances backend..."
if [ ! -d "backend/node_modules" ]; then
  echo "      Installation des dependances backend (premiere fois)..."
  (cd backend && npm install)
fi

echo "[2/4] Verification des dependances frontend..."
if [ ! -d "frontend/node_modules" ]; then
  echo "      Installation des dependances frontend (premiere fois)..."
  (cd frontend && npm install)
fi

echo "[3/4] Initialisation des donnees de demonstration..."
(cd backend && npm run seed)

echo "[4/4] Demarrage des serveurs..."
(cd backend && npm start) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo
echo "Ouverture du navigateur dans quelques secondes..."
sleep 5
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5173" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:5173" >/dev/null 2>&1 || true
fi

echo
echo "=========================================="
echo "  L'application demarre dans votre navigateur :"
echo "  http://localhost:5173"
echo
echo "  Comptes de demonstration :"
echo "    - admin / admin123  (administrateur)"
echo "    - user  / user123   (utilisateur)"
echo
echo "  Pour ARRETER l'application : Ctrl+C ici"
echo "=========================================="
echo

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null' EXIT
wait
