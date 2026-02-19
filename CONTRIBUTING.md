# Contributing to WorkForce Pro

First off, thank you for considering contributing to WorkForce Pro! It's people like you that make WorkForce Pro such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs** if possible
* **Include your environment details** (OS, browser, Node version, Python version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior** and **explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the coding style used throughout the project
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/WorkForcePro.git
   cd WorkForcePro
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/saivarshadevoju/WorkForcePro.git
   ```

4. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* `feat:` - A new feature
* `fix:` - A bug fix
* `docs:` - Documentation only changes
* `style:` - Changes that do not affect the meaning of the code
* `refactor:` - A code change that neither fixes a bug nor adds a feature
* `perf:` - A code change that improves performance
* `test:` - Adding missing tests or correcting existing tests
* `chore:` - Changes to the build process or auxiliary tools

Examples:
```
feat: add task priority filtering
fix: resolve authentication timeout issue
docs: update API endpoint documentation
```

## Code Style

### Backend (Python)

* Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
* Use type hints where appropriate
* Write docstrings for functions and classes
* Keep functions focused and small

### Frontend (TypeScript/React)

* Follow the existing code style
* Use TypeScript for type safety
* Use functional components with hooks
* Keep components small and focused
* Use meaningful variable and function names
* Comment complex logic

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

Please ensure all tests pass before submitting a pull request.

## Project Structure

* `backend/` - FastAPI backend application
* `frontend/` - Next.js frontend application
* `backend/app/routers/` - API route handlers
* `frontend/src/components/` - React components
* `frontend/src/app/` - Next.js pages

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in our README.md file.

Thank you for contributing to WorkForce Pro! 🚀
