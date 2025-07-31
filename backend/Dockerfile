FROM node:18-alpine

WORKDIR /app

COPY package.json ./backend/package.json
COPY package-lock.json ./backend/package-lock.json

RUN npm install --prefix ./backend

COPY . /app

EXPOSE 5000

CMD ["npm", "start", "--prefix", "./backend"]
