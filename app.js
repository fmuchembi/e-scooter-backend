
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors'); 

const app = express();


app.use(cors());

app.use(bodyParser.json());



// Database connection 
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5433,
};


const pool = new Pool(dbConfig);
const table = 'e_bikes';

app.post('/save-ebike', async (req, res) => {
    const postData = req.body;

 
    if (!postData.latitude || !postData.longitude) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing required point data',
        });
    }

    const latitude = parseFloat(postData.latitude);
    const longitude = parseFloat(postData.longitude);

    try {
        const client = await pool.connect();
        const sql = `
            INSERT INTO ${table} (geom)
            VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326))
            RETURNING id
        `;

     
        const result = await client.query(sql, [longitude, latitude]);

        const pointId = result.rows[0].id;

        // Release the client back to the pool
        client.release();

        //Success response
        res.status(201).json({
            status: 'success',
            message: 'Point saved successfully',
            id: pointId,
        });
    } catch (error) {
        // Handle db errors
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database error',
            error: error.message,
        });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});