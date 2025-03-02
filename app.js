
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors'); 

const app = express();


app.use(cors());

app.use(bodyParser.json());



const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || (process.env.DOCKER_ENV === 'true' ? 'db' : 'localhost'),
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
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

    
        client.release();

        res.status(201).json({
            status: 'success',
            message: 'Point saved successfully',
            id: pointId,
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database error',
            error: error.message,
        });
    }
});


app.get('/get-ebikes', async (req, res) => {
    try {
        const client = await pool.connect();
        const sql = `SELECT id, ST_X(geom) AS longitude, ST_Y(geom) AS latitude FROM e_bikes`;
        const result = await client.query(sql);
        client.release();

        res.status(200).json({
            status: 'success',
            data: result.rows,
        });
    } catch (error) {
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



const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS e_bikes (
                id SERIAL PRIMARY KEY,
                geom GEOMETRY(Point, 4326)
            );
        `);
        console.log("Table e_bikes is ready");
    } catch (error) {
        console.error("Error creating table:", error);
    } finally {
        client.release();
    }
};

// Run table creation at startup
initDb();