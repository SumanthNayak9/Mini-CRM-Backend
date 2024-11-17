const express = require("express");
const mysql = require("mysql2");
const cors = require('cors');
const app = express();
const PORT = 8000;

// app.use(cors({ origin: "http://localhost:3000" }));  // Enable CORS for frontend (port 3000)

app.use(express.json());
app.use(cors());
// MySQL Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "qwerty",
    database: "crm"
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err);
        return;
    }
    console.log("Connected to the MySQL database.");
});

// API endpoint to fetch customer and purchase data
app.get('/api/customer', (req, res) => {
    const sqlQuery = `
      SELECT 
        customer.customer_id,
        customer.customer_name,
        customer.customer_email,
        customer.customer_phone,
        customer.customer_address,
        customer_purchase.purchase_date,
        customer_purchase.purchase_value,
        campaign.campaign_description
      FROM 
        customer
      INNER JOIN 
        customer_purchase ON customer.customer_id = customer_purchase.customer_id
      INNER JOIN 
        campaign ON customer_purchase.campaign_id = campaign.campaign_id
    `;
    
  
    db.query(sqlQuery, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Server Error');
      } else {
        res.json(results); // Send the data to the frontend
      }
    });
  });


// 1. GET Audience Segments
app.get("/audience-segment", (req, res) => {
    const { total_spending, visits, last_purchase_date } = req.query;

    let query = `
        SELECT c.customer_id, c.customer_name, SUM(cp.purchase_value) as total_spending, 
               COUNT(cp.id) as visits, MAX(cp.purchase_date) as last_purchase_date,
               cam.campaign_description
        FROM customer c
        JOIN customer_purchase cp ON c.customer_id = cp.customer_id
        JOIN campaign cam ON cp.campaign_id = cam.campaign_id
        GROUP BY c.customer_id, cam.campaign_description
        HAVING 1=1
    `;

    if (total_spending) query += ` AND total_spending > ${db.escape(total_spending)}`;
    if (visits) query += ` AND visits <= ${db.escape(visits)}`;
    if (last_purchase_date) query += ` AND last_purchase_date <= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching audience segment:", err);
            return res.status(500).json({ error: "Database query error" });
        }
        res.json({ audienceSize: results.length, data: results });
    });
});

// 2. POST Define Audience Segment
app.post("/audience-segment", (req, res) => {
    const { name, conditions } = req.body;
    // Here, save `name` and `conditions` for reuse

    res.json({ message: "Audience segment saved successfully", segmentName: name });
});

// 3. POST Send Message to Audience
app.post("/send-message", (req, res) => {
    const { segmentName, messageTemplate } = req.body;

    const query = `
        SELECT c.customer_id, c.customer_name
        FROM customer c
        JOIN customer_purchase cp ON c.customer_id = cp.customer_id
        JOIN campaign cam ON cp.campaign_id = cam.campaign_id
        GROUP BY c.customer_id
        HAVING SUM(cp.purchase_value) > 10000
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error retrieving segment data:", err);
            return res.status(500).json({ error: "Database query error" });
        }

        // Loop through each customer and send the personalized message
        results.forEach(customer => {
            const message = messageTemplate.replace("[Name]", customer.customer_name);  // Replace [Name] with customer's name
            const status = Math.random() < 0.9 ? "SENT" : "FAILED";

            // Log the communication
            const logQuery = `INSERT INTO communications_log (segment_name, customer_id, message, status) VALUES (?, ?, ?, ?)`;
            db.query(logQuery, [segmentName, customer.customer_id, message, status], (err) => {
                if (err) console.error("Error logging communication:", err);
            });
        });

        res.json({ message: "Messages sent to segment", segmentName });
    });
});

// POST Delivery receipt API
app.post("/delivery-receipt", (req, res) => {
    const { communicationLogId } = req.body;

    // Simulate a 90% chance of success
    const status = Math.random() < 0.9 ? "SENT" : "FAILED";

    // Update the communication status in the communications_log table
    const updateQuery = `
        UPDATE communications_log 
        SET status = ?, created_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `;

    db.query(updateQuery, [status, communicationLogId], (err, result) => {
        if (err) {
            console.error("Error updating delivery status:", err);
            return res.status(500).json({ error: "Failed to update delivery status" });
        }

        res.json({ message: `Delivery status updated to ${status}` });
    });
});


// 4. GET Campaign History & Stats
app.get("/campaign-history", (req, res) => {
    const query = `
        SELECT segment_name, COUNT(*) as total_messages, 
               SUM(status = 'SENT') as sent, SUM(status = 'FAILED') as failed
        FROM communications_log
        GROUP BY segment_name
        ORDER BY MAX(created_at) DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error retrieving campaign history:", err);
            return res.status(500).json({ error: "Database query error" });
        }
        res.json(results);
    });
});

// Basic routes from the initial code
app.get("/users", (req, res) => {
    return res.json(users);
});

app.post("/add-user", (req, res) => {
    const { name, email, age } = req.body;

    if (!name || !email || !age) {
        return res.status(400).json({ error: "Please provide name, email, and age" });
    }

    const sql = "INSERT INTO user (name, email, age) VALUES (?, ?, ?)";

    db.query(sql, [name, email, age], (err, result) => {
        if (err) {
            console.error("Error inserting user:", err);
            return res.status(500).json({ error: "Error inserting user into database" });
        }
        res.json({ message: "User added successfully", userId: result.insertId });
    });
});

app.get("/user/:id", (req, res) => {
    const userId = req.params.id;

    const sql = "SELECT * FROM user WHERE id = ?";

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Error retrieving user:", err);
            return res.status(500).json({ error: "Error retrieving user from database" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(results[0]);
    });
});

app.listen(PORT, () => console.log(`Server started at port ${PORT}`));
