# KMI–LUPIC Laboratory Equipment Guide

A multilingual laboratory equipment guide for KMI–LUPIC, built with React, Vite, Tailwind CSS, and a small Flask/PostgreSQL backend.

## Local development

Install dependencies with `pnpm install`, then build with `pnpm build`. The backend requires a PostgreSQL connection through `DATABASE_URL`. Copy `.env.example` to a secure environment configuration and set the required values before running the Flask application.

## Admin authentication

Admin authentication is server-backed. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `FLASK_SECRET_KEY` in the deployment environment. Use a strong unique password and never place credentials in frontend source code, `.env` files committed to Git, or chat messages. All equipment, partner, translation, and News write routes require the authenticated session.

## Content responsibilities

Equipment records should be completed with official laboratory-approved safety instructions, operating procedures, maintenance guidance, manuals, and availability information. The UI shows a pending-review state when those fields are not yet available; it does not invent laboratory safety content.

## Deployment

The Render blueprint in `render.yaml` declares the database, authentication, and session variables. Configure the secret values in the hosting provider before deploying. `SESSION_COOKIE_SECURE=true` is intended for HTTPS production deployments.
