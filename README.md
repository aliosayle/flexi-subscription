# Flexi Subscription

A comprehensive business management system designed for gym and fitness centers with multi-branch support. The application provides subscription management, inventory tracking, point of sale, and reporting features.

## Features

- **Multi-branch Support**: Manage multiple branches with branch-specific data views
- **Subscription Management**: Track member subscriptions and renewal status
- **Inventory Management**: Stock tracking and inventory transactions
- **Point of Sale (POS)**: Process sales and manage transactions
- **Dashboard**: View key business metrics and analytics
- **Reports**: Generate sales and performance reports
- **User Management**: Role-based access control with permissions

## Tech Stack

This project is built with:

- **Frontend**:
  - React with TypeScript
  - Vite for build tooling
  - Tailwind CSS for styling
  - shadcn/ui component library

- **Backend**:
  - Node.js
  - Express.js
  - MySQL database

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- MySQL database

### Installation

```sh
# Clone the repository
git clone https://github.com/yourusername/flexi-subscription.git

# Navigate to the project directory
cd flexi-subscription

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your database credentials

# Run database migrations
node server/setup-db.js

# Start the development server
npm run dev
```

## Usage

After starting the server, navigate to `http://localhost:8080` in your browser to access the application. Use the login credentials:

- **Username**: admin@example.com
- **Password**: password

## Architecture

The application follows a client-server architecture:

- **Client**: React-based SPA with shadcn/ui and Tailwind CSS
- **Server**: Express.js REST API with JWT authentication
- **Database**: MySQL for data persistence

## Acknowledgements

This project was initially based on a template by Lovable.
