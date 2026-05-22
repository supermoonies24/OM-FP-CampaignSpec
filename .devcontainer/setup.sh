#!/bin/bash
# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo 'DATABASE_URL="file:./dev.db"' > .env
  echo 'PASSCODE="fordpro2024"' >> .env
  echo ".env created with default values"
fi

npm install
npx prisma migrate dev --name init
npx prisma db seed
