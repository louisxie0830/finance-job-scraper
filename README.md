# Finance Job Scraper

This project is a finance job scraper built with Node.js, designed to extract job listings from various finance-related job portals.

## Table of Contents

- [Finance Job Scraper](#finance-job-scraper)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API Routes](#api-routes)
  - [Project Structure](#project-structure)
  - [Configuration](#configuration)
  - [Logging](#logging)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/louisxie0830/finance-job-scraper.git
   ```

2. Navigate to the project directory:
   ```bash
   cd finance-job-scraper
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. The application will begin scraping job listings and log the results.

## API Routes

The following API routes are available in the application, providing job listings for different banks:

- `GET /taishin/jobs` - Retrieve job listings from Taishin Bank
- `GET /cathaybk/jobs` - Retrieve job listings from Cathay United Bank
- `GET /esunfhc/jobs` - Retrieve job listings from E.SUN FHC
- `GET /sinopac/jobs` - Retrieve job listings from SinoPac Holdings

## Project Structure

```plaintext
finance-job-scraper/
├── error.log              # Log file for errors
├── combined.log           # Combined log file for all logs
├── package.json           # Project metadata and dependencies
├── .prettierrc            # Prettier configuration file
├── .eslintrc.js           # ESLint configuration file
├── src/                   # Source code directory
│   ├── app.js             # Main application file
│   ├── middleware/        # Custom middleware functions
│   ├── plugin/            # Plugins for extending functionality
│   ├── routes/            # Route definitions
│   ├── utils/             # Utility functions
│   └── winstonLogger.js   # Logger configuration using Winston
```

## Configuration

Configuration settings for the scraper can be found in the `src/config` directory. Adjust the settings as needed for your specific use case.

## Logging

The application uses [Winston](https://github.com/winstonjs/winston) for logging. Logs are saved in the root directory as `error.log` and `combined.log`.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.