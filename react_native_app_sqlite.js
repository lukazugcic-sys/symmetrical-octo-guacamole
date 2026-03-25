import SQLite from 'react-native-sqlite-storage';

// Initialize Database
const db = SQLite.openDatabase({
    name: 'myDB.db',
    location: 'default',
    createFromLocation: '1'
});

// Function to initialize the database and create tables if they do not exist
const initDB = () => {
    db.transaction(tx => {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT
        );`);
    }, error => {
        console.error('Error initializing database: ', error);
    }, () => {
        console.log('Database initialized successfully.');
    });
};

// Function to save a user in the database
const saveUser = (name, email) => {
    db.transaction(tx => {
        tx.executeSql('INSERT INTO Users (name, email) VALUES (?, ?)', [name, email]);
    }, error => {
        console.error('Error saving user: ', error);
    }, () => {
        console.log('User saved successfully.');
    });
};

// Function to fetch users
const fetchUsers = (callback) => {
    db.transaction(tx => {
        tx.executeSql('SELECT * FROM Users', [], (tx, results) => {
            const users = [];
            for (let i = 0; i < results.rows.length; i++) {
                users.push(results.rows.item(i));
            }
            callback(users);
        });
    }, error => {
        console.error('Error fetching users: ', error);
    });
};

// Function for database migration logic (version 1 to version 2 as an example)
const migrateDatabase = () => {
    db.transaction(tx => {
        tx.executeSql(`ALTER TABLE Users ADD COLUMN age INTEGER;`);
    }, error => {
        console.error('Migration error: ', error);
    }, () => {
        console.log('Migration completed successfully.');
    });
};

// Export functions for use in the app
export { initDB, saveUser, fetchUsers, migrateDatabase };