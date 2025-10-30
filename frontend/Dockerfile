FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Used ci to install dependencies and not dev
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
