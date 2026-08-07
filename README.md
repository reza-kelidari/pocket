# Pocket

Pocket is a Persian-language personal finance and accounting application built with Next.js. It allows users to manage accounts, record transactions, track balances over time, and maintain full control over their financial data.

The application is mobile-first, right-to-left, and uses the Jalali calendar.

## Features

- Account management with multiple account types, including bank accounts, wallets, investment accounts, and crypto wallets
- Customizable account colors
- Drag-and-drop ordering for accounts
- Transaction recording for income, expenses, transfers, and initial balances
- Transaction categories
- Custom tags
- Jalali date and time input
- Balance history charts for individual accounts and total balance
- Transaction filtering by time range and account
- Backup and restore using `.pbak` files
- Excel import with template generation, preview, validation, and automatic account and tag creation
- Swipe actions for editing and deleting records
- Permanent deletion of all user data
- Privacy-focused design

## Tech Stack

| Technology     | Purpose                               |
| -------------- | ------------------------------------- |
| Next.js 16     | React framework and routing           |
| React 19       | User interface                        |
| TypeScript     | Type safety                           |
| Tailwind CSS 4 | Styling                               |
| PostgreSQL     | Database                              |
| pg             | PostgreSQL client                     |
| dnd-kit        | Drag and drop                         |
| ExcelJS        | Excel template generation and parsing |
| jalaali-js     | Jalali date conversion                |
| PM2            | Production process management         |

## Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL
- An external authentication service

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pocket
```


### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Or run it with PM2:

```bash
pm2 start npm --name pocket -- start
```

## Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the development server         |
| `npm run build` | Build the application for production |
| `npm start`     | Start the production server          |
| `npm run lint`  | Run ESLint                           |

## Project Structure

```text
app/            Application pages and API routes
components/     Reusable UI components
icons/          SVG icon components
utility/        Business logic, types, and helpers
public/         Static assets
```

### Main Modules

| Module                        | Description                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| `app/accounts`                | Account creation, editing, deletion, and details                        |
| `app/transactions`            | Transaction recording, editing, filtering, and details                  |
| `app/options`                 | Tags, backup and restore, Excel import, delete all data, privacy policy |
| `app/api`                     | API routes for accounts, transactions, and tags                         |
| `components/ChartContainer`   | Balance history chart                                                   |
| `components/SwipeableElement` | Swipe-to-edit and swipe-to-delete interactions                          |
| `components/SortableElement`  | Drag-and-drop account ordering                                          |
| `utility/db`                  | Database access layer                                                   |
| `utility/balance`             | Balance calculation and balance state management                        |
| `utility/import`              | Excel template generation, parsing, and import logic                    |

## Authentication

Pocket uses an external authentication service on a same domain (you should use a subdomain for authentication).

If the user does not have a valid session, the application redirects them to the authentication service. After authentication, a session cookie is used to identify the user.

All API requests are protected and scoped to the authenticated user.

## Default Accounts

When a user initializes the application for the first time, the following default accounts are created:

- Wallet
- Claims
- Debts
- Funds in transit

These accounts help structure common personal accounting scenarios.

## Backup and Restore

Users can download a full backup of their data as a `.pbak` file.

The backup contains:

- Accounts
- Tags
- Transactions

The backup can be restored later. Restoring a backup replaces all existing data.

## Excel Import

Pocket supports importing transactions from Excel.

The import flow includes:

1. Downloading an Excel template containing existing accounts and tags
2. Filling transaction data in the template
3. Uploading the completed file
4. Previewing parsed accounts, tags, and transactions
5. Confirming and importing the data into the database

Missing accounts and tags are created automatically during import.

## Privacy

Pocket is designed with a privacy-first approach.

- Financial data is stored per user and isolated by user identifier
- Data is not used for advertising or analytics
- Users can permanently delete all data
- Backup files are generated and stored by the user

## License

MIT
