@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Mise en ligne de Budget sur github.com/ToxxKing/budget ===
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git n'est pas installe. Installe-le depuis https://git-scm.com/download/win puis relance ce fichier.
  pause
  exit /b 1
)
if not exist ".git" (
  git init
  git config user.name >nul 2>nul || git config user.name "ToxxKing"
  git config user.email >nul 2>nul || git config user.email "ToxxKing@users.noreply.github.com"
)
git add .
git commit -m "Budget v2 - PWA iPhone hors connexion" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/ToxxKing/budget.git
echo.
echo Envoi vers GitHub (une fenetre de connexion peut s'ouvrir : connecte-toi avec ToxxKing)...
git push -u origin main
if errorlevel 1 (
  echo.
  echo Le push a echoue. Verifie que tu es connecte avec le compte ToxxKing, puis relance.
  pause
  exit /b 1
)
echo.
echo C'est envoye ! Derniere etape : sur GitHub, Settings ^> Pages ^> Source : GitHub Actions.
start https://github.com/ToxxKing/budget/settings/pages
pause
