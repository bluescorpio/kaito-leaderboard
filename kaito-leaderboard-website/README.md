# Kaito Leaderboard Website

This project is a web application that retrieves and displays the top users from Kaito's various leaderboards. It utilizes React for the frontend and TypeScript for type safety.

## Project Structure

```
kaito-leaderboard-website
├── public
│   └── index.html          # Main HTML file for the website
├── src
│   ├── api
│   │   └── kaitoApi.ts    # API calls to fetch leaderboard data
│   ├── components
│   │   └── Leaderboard.tsx # React component to display leaderboard
│   ├── styles
│   │   └── main.css        # CSS styles for the application
│   ├── App.tsx             # Main application component
│   └── index.tsx           # Entry point for the React application
├── package.json             # npm configuration file
├── tsconfig.json            # TypeScript configuration file
└── README.md                # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd kaito-leaderboard-website
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run the application:**
   ```
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to view the application.

## Usage

The application will automatically fetch and display the top users from Kaito's leaderboards. You can customize the API calls in the `kaitoApi.ts` file by modifying the parameters for `fetchLeaderboard`.

## Contributing

Feel free to submit issues or pull requests for any enhancements or bug fixes.