# Binapex

Binapex is a next-generation trading platform with dual interfaces: **BullVest** (Fast Trades) and **BearVest** (Steady Trades). It features a premium design, real-time market data, and a secure backend.

## 🚀 Summary
Binapex offers a comprehensive trading experience tailored for different market strategies.
- **BullVest**: High-frequency trading portal for fast-paced market action.
- **BearVest**: Strategic trading portal for long-term positions.
- **Admin Portal**: Complete management system for users, trades, and finances.

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (React 19), Tailwind CSS, Shadcn/UI
- **Backend / Database**: Supabase (PostgreSQL, Auth, Realtime)
- **Deployment**: Vercel & Docker
- **Monitoring**: Sentry

## ⚙️ Workflow

### Local Development
1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd Binapex-dec
    ```
2.  **Install dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  **Set up Environment**:
    - Copy `.env.example` to `.env.local`
    - Add Supabase credentials.
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

### Docker Deployment
Binapex is container-ready.
1.  **Build**: `docker-compose build`
2.  **Run**: `docker-compose up -d`
3.  **Access**: `http://localhost:3000`

### Vercel Deployment
Designed for serverless deployment on Vercel.
- **Production URL**: [https://www.binapex.my](https://www.binapex.my)
- **Deploy Command**: `vercel deploy --prod`

## 📂 Project Structure
- `/app`: Next.js App Router pages
- `/components`: Reusable UI components
- `/supabase`: Database migrations and types
- `/public`: Static assets
