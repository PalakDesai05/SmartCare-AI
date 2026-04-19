-- ============================================================
--  HealthAI Database Setup Script (MySQL)
--  Run this ONCE before starting the backend.
-- ============================================================

CREATE DATABASE IF NOT EXISTS healthai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE healthai_db;

-- NOTE: SQLAlchemy will auto-create all tables via Base.metadata.create_all()
-- This file is just for manual reference or initial DB creation.

-- Seed admin user (password: admin123 — bcrypt hash below)
-- You can register via POST /auth/register instead.

-- Seed sample doctors via POST /auth/register + POST /doctors/ after backend starts.
