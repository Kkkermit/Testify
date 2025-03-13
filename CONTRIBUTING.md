# Contributing to Testify

Thank you for considering contributing to Testify! This document outlines the process and guidelines for contributing to this project.

## How to Contribute

### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Testify.git`
3. Navigate to the project directory: `cd Testify`
4. Install dependencies: `npm install`
5. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

### Making Changes

- Only make necessary changes related to your feature or bug fix
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments where necessary to explain complex logic
- Write or update tests for your changes when applicable

### Package.json Etiquette

**Important:** Do not modify `package.json` unless:
- You need to add a new dependency
- You need to update a dependency version to fix a critical issue
- You're creating a new npm script

For version bumps, let the maintainers handle version changes in package.json as part of the release process.

### Committing Your Changes

We use a standardized commit message format to keep our git history clean and informative. Use our custom commit script:

```bash
npm run commit
```

This script will guide you through creating a properly formatted commit message in the format:
```
type: concise description of the change
```

Where "type" is one of:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring with no feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc
- `add`: Adding new features or files
- `update`: Updating existing features or files
- `remove`: Removing features or files

### Pull Request Process

1. Ensure your code follows the style guidelines and passes all tests
2. Update documentation if necessary
3. Push your changes to your fork: `git push origin feature/your-feature-name`
4. Create a Pull Request from your fork to the main repository
5. In your Pull Request description, include:
   - What changes you've made
   - Why you've made them
   - How they work
   - Any screenshots for UI changes
   - Any relevant issue numbers (e.g., "Fixes #123")

## Pull Request Requirements

For your PR to be considered:

1. It must focus on a single feature or fix
2. The code must be well-tested
3. It should not include unrelated changes
4. The commit history should follow our guidelines
5. It must not break existing functionality

## Code Review Process

1. The maintainers will review your PR
2. They may request changes or clarifications
3. Once approved, your PR will be merged

## Additional Guidelines

- **Bug Reports**: Use the Issues tab with the bug report template
- **Feature Requests**: Use the Issues tab with the feature request template
- **Questions**: Join our [Discord server](https://discord.gg/xcMVwAVjSD) for questions rather than opening an issue

Thank you for contributing to Testify!
