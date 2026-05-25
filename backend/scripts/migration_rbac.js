const { pool } = require('../config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting RBAC migration...');

        // 1. Add new columns if they don't exist
        await client.query(`
            ALTER TABLE "User" 
            ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
            ADD COLUMN IF NOT EXISTS "resetToken" TEXT,
            ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP;
        `);
        console.log('Added new columns to "User" table.');

        // 2. Update role column to have a default of 'SALES_CLERK'
        await client.query(`
            ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'SALES_CLERK';
        `);
        console.log('Updated role default to SALES_CLERK.');

        // 3. Update existing users first to satisfy the constraint
        // Get all users ordered by createdAt
        const usersRes = await client.query('SELECT id FROM "User" ORDER BY "createdAt" ASC');
        
        if (usersRes.rows.length > 0) {
            const firstUserId = usersRes.rows[0].id;
            
            // Set the first user as ADMIN
            await client.query(`
                UPDATE "User" SET role = 'ADMIN' WHERE id = $1;
            `, [firstUserId]);
            
            // Set others as SALES_CLERK if they don't have a valid role yet
            if (usersRes.rows.length > 1) {
                await client.query(`
                    UPDATE "User" SET role = 'SALES_CLERK' 
                    WHERE id != $1;
                `, [firstUserId]);
            }
            console.log('Updated existing users roles.');
        }

        // 4. Add CHECK constraint for roles if it doesn't exist
        // First, check if the constraint exists
        const constraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.constraint_column_usage 
            WHERE table_name = 'User' AND constraint_name = 'user_role_check';
        `);

        if (constraintCheck.rows.length === 0) {
            await client.query(`
                ALTER TABLE "User" 
                ADD CONSTRAINT user_role_check 
                CHECK (role IN ('ADMIN', 'MANAGER', 'SALES_CLERK'));
            `);
            console.log('Added role CHECK constraint.');
        }

        console.log('RBAC migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        // Don't call pool.end() here as it's handled by beforeExit in database.js
    }
};

runMigration();
