# Dyad Web App

This is the web application version of Dyad, converted from the original Electron app.

## Features

- All the functionality of the Dyad Electron app, now available in your browser
- Real-time chat streaming with AI models
- App creation, management, and deployment
- File editing and version control
- Settings management

## Architecture

The web app consists of two main parts:

1. **Frontend**: A React application built with:
   - React 19
   - TanStack Router
   - TanStack Query
   - Socket.io client for real-time communication
   - Tailwind CSS for styling

2. **Backend**: A Node.js Express server that:
   - Handles API requests
   - Manages real-time communication via Socket.io
   - Interfaces with the database
   - Manages file operations and app execution

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/dyad-sh/dyad.git
   cd dyad
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   ```

### Development

Run the development server (both frontend and backend):
```
npm run dev
```

This will start:
- The frontend at http://localhost:5173
- The backend at http://localhost:3000

### Building for Production

Build the application:
```
npm run build
```

Start the production server:
```
npm start
```

## Deployment

The application can be deployed to any platform that supports Node.js applications, such as:

- Vercel
- Netlify
- Heroku
- AWS
- Google Cloud Run

## License

MIT
