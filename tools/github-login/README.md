GitHub Local Login Helper

What this is
- A local HTML helper to build `gh auth login --with-token` commands for PowerShell, cmd.exe, and bash.
- It does NOT send your token anywhere — it constructs a command you copy and run in your terminal.

How to use
1. Open the file in your browser: `tools/github-login/index.html` (double-click it or open via your browser: File → Open).
2. Enter your GitHub username (optional), your Personal Access Token (PAT), repository (`owner/repo`) and branch (default `main`).
3. Click "Generate Commands" and copy the command for your shell.

Commands to run (examples)
- PowerShell (paste the generated block and press Enter):
  $token = 'YOUR_TOKEN_HERE'
  $token | gh auth login --with-token

- cmd.exe (Command Prompt):
  echo YOUR_TOKEN_HERE | gh auth login --with-token

- Bash (Git Bash / WSL / macOS / Linux):
  echo 'YOUR_TOKEN_HERE' | gh auth login --with-token

After authenticating
1. Verify: `gh auth status`
2. Push your commit:
   git push -u origin main

If you get a 403 permission error
- Ensure the account you authenticated has write access to `serphawk22/WorkForcePro-Demo-App` (either it's your account, or you're a collaborator). If not, ask the repo owner to add you as a collaborator or push to a fork.

Security note
- Keep your PAT secret. Do not paste it on unknown websites. This helper runs locally and does not transmit your token.
