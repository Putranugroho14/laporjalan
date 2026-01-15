const fs = require('fs');
const path = require('path');

// Load .env if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    try {
        require('dotenv').config({ path: envPath });
    } catch (e) {
        // dotenv might not be installed yet or failed
        console.warn("dotenv not loaded:", e.message);
    }
}

module.exports = {
    development: {
        // Build dynamic config based on env vars
        ...(process.env.DATABASE_URL ? {
            use_env_variable: 'DATABASE_URL',
            dialect: 'mysql', // Default to mysql for Cloud DB in this project context
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            dialectModule: require('mysql2'),
        } : {
            dialect: 'sqlite',
            storage: './database.sqlite'
        }),
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'mysql',
        dialectModule: require('mysql2'), // Explicitly use mysql2 for Vercel/Lambda environment
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Change to true if you provide the CA certificate
            },
            connectTimeout: 60000
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
};
