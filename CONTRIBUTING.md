# Contributing to SmartDrop Frontend

Thank you for your interest in contributing to SmartDrop! We welcome contributions from everyone. Please take a moment to review this document to understand the setup process, coding standards, and pull request workflow.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (matches `.nvmrc` and `engines`)
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Git**

### Installation & Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/<your-username>/smartdrop-frontend.git
   cd smartdrop-frontend
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and configure the necessary variables:
   ```bash
   cp .env.example .env.local
   ```

4. **Start the Development Server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## 🧪 Testing & Verification

Before submitting changes, ensure that your code adheres to quality standards and passes all verifications:

- **Type Check**:
  ```bash
  pnpm typecheck
  ```
- **Linting**:
  ```bash
  pnpm lint
  ```
- **Unit & Integration Tests**:
  ```bash
  pnpm test
  ```
- **End-to-End Tests (Playwright)**:
  ```bash
  pnpm playwright
  ```

---

## 📐 Coding Standards & Guidelines

- **TypeScript**: Ensure strict typing is maintained. Avoid using `any` wherever possible.
- **Component Design**:
  - Use React function components and React hooks.
  - Follow the existing project structure under `src/components/`, `src/hooks/`, and `src/app/`.
  - Maintain accessibility (`aria-*` attributes, semantic HTML landmarks, keyboard navigation).
- **Styling**:
  - Follow the theme tokens configured with Chakra UI (`app.text`, `app.accent`, `app.border`, `app.surface`, etc.).
  - Ensure support for both light and dark modes.

---

## 🌿 Branching & Commit Conventions

- Use descriptive branch names:
  - `feat/feature-name` for new features
  - `fix/bug-description` for bug fixes
  - `docs/documentation-update` for documentation changes
  - `chore/task-name` for maintenance or configuration updates
- Follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add wallet balance preview in lock flow`
  - `fix: resolve dark mode tooltip contrast in TvlChart`
  - `docs: add comprehensive CONTRIBUTING.md guidelines`

---

## 🚀 Pull Request Process

1. Create a branch from `main`.
2. Commit your changes with clear, descriptive commit messages.
3. Push your branch to your fork.
4. Open a Pull Request against the `main` branch of `SmartDropLabs/smartdrop-frontend`.
5. In your PR description, explain the changes made and reference any relevant issue (e.g. `Closes #304`).
6. Ensure all CI status checks pass. Address any reviewer feedback promptly.

---

## 🤝 Community & Code of Conduct

Please maintain a respectful and welcoming environment for all participants. If you encounter any bugs, feel free to open an issue with a detailed reproduction path.
