-- Migration: Add notes column to sales_master
-- Created: 2026-02-16
-- Description: Adds missing notes column required for Sales Returns

ALTER TABLE sales_master 
ADD COLUMN IF NOT EXISTS notes TEXT;
