# Trivia Game MVP

A real-time trivia game with buzzer functionality and speech-to-text answer capture.

## Features

- Host and contestant views
- Real-time buzzer system
- Speech-to-text answer capture
- Live scoreboard
- Room-based game sessions

## Tech Stack

- **Frontend**: React, Tailwind CSS, Socket.io Client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB

## Local Development Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd trivia-app-mvp/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string and other settings.

5. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd trivia-app-mvp/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your backend API URL.

5. Start the development server:
   ```
   npm start
   ```

## Deployment

### Backend Deployment

1. Create an account on a hosting service (Heroku, Render, Railway, etc.)
2. Create a new app/service
3. Connect your GitHub repository or upload the code
4. Set the following environment variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `FRONTEND_URL`: Your deployed frontend URL
   - `PORT`: Usually set automatically by the hosting service
   - `NODE_ENV`: Set to "production"
5. Deploy the application

### Frontend Deployment

1. Create an account on a static hosting service (Vercel, Netlify, etc.)
2. Connect your GitHub repository or upload the code
3. Set the build command to `npm run build`
4. Set the publish directory to `build`
5. Set the following environment variables:
   - `REACT_APP_API_URL`: Your deployed backend API URL
   - `REACT_APP_BACKEND_URL`: Your deployed backend URL
6. Deploy the application

### Database Deployment

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your connection string
5. Use this connection string in your backend's `MONGO_URI` environment variable

## How to Play

1. Host opens the host dashboard
2. Host shares the room code with contestants
3. Contestants join using the room code
4. Host starts the game and enables the buzzer for each question
5. Contestants buzz in to answer
6. The first contestant to buzz in gets to answer using speech
7. Scores are updated in real-time

## License

MIT 